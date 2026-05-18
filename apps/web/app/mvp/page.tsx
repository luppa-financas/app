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

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const debits = detail?.transactions.filter((t) => t.type === 'DEBIT') ?? [];

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
              <button
                key={inv.id}
                onClick={() => setSelectedId(inv.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  selectedId === inv.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {new Date(inv.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                {inv.status === 'PENDING' && <span className="ml-1 text-xs opacity-70">(processando…)</span>}
                {inv.status === 'FAILED' && <span className="ml-1 text-xs text-red-400">(falhou)</span>}
              </button>
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
                  {detail.transactions.map((t) => (
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
                .map((entry, i) => (
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
    </main>
  );
}
