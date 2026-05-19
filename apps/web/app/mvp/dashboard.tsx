'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL;

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
];

type InvoiceStatus = 'PENDING' | 'DONE' | 'FAILED';

type Invoice = {
  id: string;
  status: InvoiceStatus;
  createdAt: string;
};

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  subcategory: string | null;
};

type InvoiceDetail = Invoice & { transactions: Transaction[] };

export default function Dashboard() {
  const { getToken } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const fetchInvoices = useCallback(async () => {
    const h = await headers();
    const res = await fetch(`${API}/invoices`, { headers: h });
    if (!res.ok) return;
    const data: Invoice[] = await res.json();
    setInvoices(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [headers]);

  const fetchDetail = useCallback(async (id: string) => {
    const h = await headers();
    const res = await fetch(`${API}/invoices/${id}`, { headers: h });
    if (!res.ok) return;
    const data: InvoiceDetail = await res.json();
    setDetail(data);
    return data;
  }, [headers]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  useEffect(() => {
    if (!selectedId) return;
    fetchDetail(selectedId);
    setFilterCategory('');
    setFilterSubcategory('');
    setFilterType('ALL');
  }, [selectedId, fetchDetail]);

  const startPolling = useCallback((id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const data = await fetchDetail(id);
      if (data?.status === 'DONE' || data?.status === 'FAILED') {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        fetchInvoices();
      }
    }, 3000);
  }, [fetchDetail, fetchInvoices]);

  async function handleDelete() {
    if (!deleteTargetId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const h = await headers();
      const res = await fetch(`${API}/invoices/${deleteTargetId}`, { method: 'DELETE', headers: h });
      if (!res.ok) throw new Error('Erro ao excluir fatura');
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteTargetId));
      if (selectedId === deleteTargetId) {
        setSelectedId(null);
        setDetail(null);
      }
      setDeleteTargetId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const h = await headers();
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API}/invoices`, { method: 'POST', headers: h, body });
      if (!res.ok) throw new Error('Erro ao enviar fatura');
      const { invoiceId } = await res.json();
      await fetchInvoices();
      setSelectedId(invoiceId);
      startPolling(invoiceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const allTransactions = detail?.transactions ?? [];

  const categories = [...new Set(allTransactions.map((t) => t.category))].sort();
  const subcategories = [...new Set(
    allTransactions
      .filter((t) => !filterCategory || t.category === filterCategory)
      .map((t) => t.subcategory)
      .filter((s): s is string => s !== null)
  )].sort();

  const filteredTransactions = allTransactions.filter((t) => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (filterSubcategory && t.subcategory !== filterSubcategory) return false;
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    return true;
  });

  const hasFilters = filterCategory !== '' || filterSubcategory !== '' || filterType !== 'ALL';

  const debits = filteredTransactions.filter((t) => t.type === 'DEBIT');

  const pieData = debits.length
    ? Object.entries(
        debits.reduce<Record<string, number>>((acc, t) => {
          acc[t.category] = (acc[t.category] ?? 0) + parseFloat(t.amount);
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    : [];

  const total = debits.reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <h1 className="text-2xl font-bold mb-8 text-gray-900">Luppa</h1>

      {/* Upload */}
      <section className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">Enviar fatura</h2>
        <label className="flex items-center gap-3 cursor-pointer w-fit">
          <span className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            {uploading ? 'Enviando…' : 'Selecionar PDF'}
          </span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </section>

      {/* Invoice selector */}
      {invoices.length > 0 && (
        <section className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-4">Faturas</h2>
          <div className="flex flex-wrap gap-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className={`flex items-center rounded-lg text-sm border transition ${
                  selectedId === inv.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                <button
                  onClick={() => setSelectedId(inv.id)}
                  className="px-3 py-1.5"
                >
                  {new Date(inv.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  {inv.status === 'PENDING' && <span className="ml-1 text-xs opacity-70">(processando…)</span>}
                  {inv.status === 'FAILED' && <span className="ml-1 text-xs text-red-400">(falhou)</span>}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTargetId(inv.id); setDeleteError(null); }}
                  aria-label="Excluir fatura"
                  className={`pr-2 pl-1 py-1.5 opacity-50 hover:opacity-100 transition ${
                    selectedId === inv.id ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detail */}
      {detail && detail.status === 'DONE' && detail.transactions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Table */}
          <section className="xl:col-span-2 bg-white rounded-xl border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Transações</h2>
              <span className="text-sm text-gray-500">
                Total gasto: <strong className="text-gray-900">R$ {total.toFixed(2)}</strong>
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              {subcategories.length > 0 && (
                <select
                  value={filterSubcategory}
                  onChange={(e) => setFilterSubcategory(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
                >
                  <option value="">Todas as subcategorias</option>
                  {subcategories.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'ALL' | 'DEBIT' | 'CREDIT')}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
              >
                <option value="ALL">Todos os tipos</option>
                <option value="DEBIT">Saídas</option>
                <option value="CREDIT">Entradas</option>
              </select>

              {hasFilters && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterSubcategory(''); setFilterType('ALL'); }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 px-2"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">Data</th>
                    <th className="pb-2 pr-4">Descrição</th>
                    <th className="pb-2 pr-4">Categoria</th>
                    <th className="pb-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4">{t.description}</td>
                      <td className="py-2 pr-4">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{t.category}</span>
                        {t.subcategory && (
                          <span className="ml-1 text-xs text-gray-500">{t.subcategory}</span>
                        )}
                      </td>
                      <td className={`py-2 text-right font-mono font-medium ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'CREDIT' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pie chart */}
          <section className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4 text-gray-900">Por categoria</h2>
            <PieChart width={240} height={240}>
              <Pie
                data={pieData}
                cx={115}
                cy={115}
                innerRadius={65}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => `R$ ${Number(v).toFixed(2)}`}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
              />
            </PieChart>
            <ul className="mt-4 space-y-2">
              {pieData
                .sort((a, b) => b.value - a.value)
                .map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: COLORS[pieData.indexOf(entry) % COLORS.length] }} />
                      <span className="text-gray-700">{entry.name}</span>
                    </span>
                    <span className="text-gray-500 tabular-nums">
                      R$ {entry.value.toFixed(2)}
                      <span className="ml-2 text-xs text-gray-400">
                        {((entry.value / total) * 100).toFixed(0)}%
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}

      {detail?.status === 'PENDING' && (
        <p className="text-sm text-gray-500 mt-4">Processando fatura, aguarde…</p>
      )}
      {detail?.status === 'FAILED' && (
        <p className="text-sm text-red-500 mt-4">Falha ao processar esta fatura.</p>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Excluir fatura?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Essa ação não pode ser desfeita. A fatura e todas as suas transações serão removidas.
            </p>
            {deleteError && <p className="text-sm text-red-500 mb-4">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
