'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { detectEncryptedPdf } from '../../lib/pdf-crypto';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL;

const CATEGORIES: Record<string, string[]> = {
  Alimentação: ['Delivery', 'Restaurante', 'Supermercado', 'Padaria / Café', 'Lanchonete / Fast food'],
  Transporte: ['Uber / 99 / Taxi', 'Combustível', 'Estacionamento', 'Transporte público', 'Pedágio'],
  Moradia: ['Aluguel', 'Condomínio', 'Água / Luz / Gás', 'Internet / TV', 'Manutenção'],
  Saúde: ['Farmácia', 'Consulta médica', 'Exame / Laboratório', 'Plano de saúde', 'Academia'],
  Entretenimento: ['Cinema / Teatro', 'Jogos', 'Bares / Baladas'],
  Assinaturas: ['Streaming', 'Música', 'Software', 'Outros serviços'],
  Compras: ['Roupas / Calçados', 'Eletrônicos', 'Casa / Decoração', 'Marketplace', 'Cosméticos / Beleza'],
  Educação: ['Faculdade / Curso', 'Livros', 'Assinatura de conteúdo'],
  Viagem: ['Passagem', 'Hospedagem', 'Aluguel de carro', 'Passeios / Atrações'],
  Finanças: ['Fatura / Boleto', 'Investimento', 'Seguro', 'Tarifa bancária'],
  Pets: ['Veterinário', 'Ração / Petisco', 'Pet shop / Banho e tosa', 'Medicamento / Vacina'],
  Outros: [],
};

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16', '#06b6d4',
];

type InvoiceStatus = 'PENDING' | 'DONE' | 'FAILED';

type Invoice = {
  id: string;
  status: InvoiceStatus;
  billingMonth: string;
};

type Transaction = {
  id: string;
  date: string;
  description: string;
  alias: string | null;
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
  const [editForm, setEditForm] = useState<{ transaction: Transaction; alias: string; category: string; subcategory: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [billingMonth, setBillingMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
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
    setInvoices(data.sort((a, b) => new Date(b.billingMonth).getTime() - new Date(a.billingMonth).getTime()));
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

  function openEdit(t: Transaction) {
    setEditForm({ transaction: t, alias: t.alias ?? t.description, category: t.category, subcategory: t.subcategory ?? '' });
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    setSaving(true);
    try {
      const h = await headers();
      const res = await fetch(`${API}/transactions/${editForm.transaction.id}`, {
        method: 'PUT',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias: editForm.alias !== editForm.transaction.description ? editForm.alias : undefined,
          category: editForm.category,
          subcategory: editForm.subcategory || null,
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      const updated: Transaction = await res.json();
      setDetail((prev) =>
        prev
          ? { ...prev, transactions: prev.transactions.map((t) => (t.id === updated.id ? updated : t)) }
          : prev,
      );
      setEditForm(null);
    } finally {
      setSaving(false);
    }
  }

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

  async function uploadBytes(filename: string, bytes: Uint8Array, month: string, password?: string) {
    const h = await headers();
    const body = new FormData();
    body.append('file', new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename);
    body.append('billingMonth', `${month}-01T00:00:00.000Z`);
    if (password) body.append('password', password);
    const res = await fetch(`${API}/invoices`, { method: 'POST', headers: h, body });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
      const err = new Error(data?.message ?? 'Erro ao enviar fatura') as Error & { code?: string };
      if (data?.code) err.code = data.code;
      throw err;
    }
    const { invoiceId } = (await res.json()) as { invoiceId: string };
    await fetchInvoices();
    setSelectedId(invoiceId);
    startPolling(invoiceId);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (detectEncryptedPdf(bytes)) {
      setPendingFile({ name: file.name, bytes });
      setPdfPassword('');
      setPasswordError(null);
      return;
    }

    setUploading(true);
    try {
      await uploadBytes(file.name, bytes, billingMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setUploading(false);
    }
  }

  async function handlePasswordSubmit() {
    if (!pendingFile) return;
    setUploading(true);
    setPasswordError(null);
    try {
      await uploadBytes(pendingFile.name, pendingFile.bytes, billingMonth, pdfPassword);
      setPendingFile(null);
      setPdfPassword('');
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      if (code === 'WRONG_PASSWORD') {
        setPasswordError(msg);
      } else {
        setError(msg);
        setPendingFile(null);
        setPdfPassword('');
      }
    } finally {
      setUploading(false);
    }
  }

  function handleCancelPassword() {
    setPendingFile(null);
    setPdfPassword('');
    setPasswordError(null);
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

        {pendingFile ? (
          <div className="flex flex-col gap-3 max-w-sm">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{pendingFile.name}</span> está protegido por senha.
            </p>
            <input
              type="password"
              placeholder="Senha do PDF"
              value={pdfPassword}
              onChange={(e) => { setPdfPassword(e.target.value); setPasswordError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handlePasswordSubmit(); }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={uploading}
              autoFocus
            />
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => void handlePasswordSubmit()}
                disabled={uploading || !pdfPassword}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {uploading ? 'Enviando…' : 'Confirmar'}
              </button>
              <button
                onClick={handleCancelPassword}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              disabled={uploading}
              className="border rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
          </div>
        )}

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
                  {new Date(inv.billingMonth).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
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
                    <tr key={t.id} className="group border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-1">
                          {t.alias ?? t.description}
                          <button
                            onClick={() => openEdit(t)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity"
                            aria-label="Editar transação"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                        </span>
                        {t.alias && <span className="block text-xs text-gray-400">{t.description}</span>}
                      </td>
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

      {editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="font-semibold text-gray-900 mb-4">Editar transação</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome exibido</label>
                <input
                  type="text"
                  value={editForm.alias}
                  onChange={(e) => setEditForm((f) => f && { ...f, alias: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => f && { ...f, category: e.target.value, subcategory: '' })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white"
                >
                  {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {CATEGORIES[editForm.category]?.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subcategoria</label>
                  <select
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm((f) => f && { ...f, subcategory: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white"
                  >
                    <option value="">Nenhuma</option>
                    {CATEGORIES[editForm.category].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditForm(null)}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
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
