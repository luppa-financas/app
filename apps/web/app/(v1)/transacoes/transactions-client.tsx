'use client';

import { useTransactions, LIMIT } from '../../../hooks/use-transactions';
import { formatBRL, formatMonth } from '../../../lib/format';
import { bankLabel, BANK_DISPLAY } from '../../../lib/banks';

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde',
  'Entretenimento', 'Assinaturas', 'Compras', 'Educação',
  'Viagem', 'Finanças', 'Pets', 'Outros',
];

const SELECT_CLS = 'bg-white border border-slate-200 rounded-lg px-3 h-9 text-sm text-slate-700 outline-none cursor-pointer';

interface ApiTransaction {
  id: string;
  date: string;
  description: string;
  alias: string | null;
  amount: string | number;
  type: 'DEBIT' | 'CREDIT';
  category: string | null;
  subcategory: string | null;
  invoice: { bank: string | null };
}

function SortTh({
  label, field, sort, order, onClick, align = 'left',
}: {
  label: string;
  field: 'date' | 'amount';
  sort: 'date' | 'amount';
  order: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  const active = sort === field;
  const icon = !active ? '↕' : order === 'asc' ? '↑' : '↓';
  return (
    <th
      onClick={onClick}
      className={`text-${align} text-xs font-semibold text-slate-400 uppercase tracking-widest px-5 py-3.5 cursor-pointer select-none hover:text-slate-600 transition-colors`}
    >
      {align === 'right' && (
        <span className={active ? 'text-indigo-500' : 'text-slate-300'}>{icon} </span>
      )}
      {label}
      {align === 'left' && (
        <span className={`ml-1 ${active ? 'text-indigo-500' : 'text-slate-300'}`}>{icon}</span>
      )}
    </th>
  );
}

export function TransactionsClient({ months }: { months: string[] }) {
  const {
    transactions, total, page, sort, order,
    q, month, bank, category, loading,
    setPage, setQ, setMonth, setBank, setCategory, toggleSort,
  } = useTransactions();

  const txs = transactions as ApiTransaction[];
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 flex-1 min-w-48">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar transação…"
            className="text-sm text-slate-800 w-full outline-none placeholder-slate-400"
          />
        </div>

        <select value={month} onChange={(e) => setMonth(e.target.value)} className={SELECT_CLS}>
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>

        <select value={bank} onChange={(e) => setBank(e.target.value)} className={SELECT_CLS}>
          <option value="">Todos os bancos</option>
          {Object.entries(BANK_DISPLAY)
            .filter(([k]) => k !== 'other')
            .map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className={SELECT_CLS}>
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <SortTh label="Data" field="date" sort={sort} order={order} onClick={() => toggleSort('date')} />
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 py-3.5">
                  Descrição
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 py-3.5 whitespace-nowrap">
                  Categoria
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 py-3.5 hidden lg:table-cell">
                  Banco
                </th>
                <SortTh label="Valor" field="amount" sort={sort} order={order} onClick={() => toggleSort('amount')} align="right" />
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-50 pointer-events-none' : ''}>
              {txs.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-slate-400 py-12">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                txs.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap font-mono tabular-nums">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <span className="text-slate-800 truncate block">{tx.alias ?? tx.description}</span>
                      {tx.alias && (
                        <span className="text-xs text-slate-400 truncate block mt-0.5">{tx.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {tx.category ? (
                        <span className="text-slate-600">
                          {tx.category}
                          {tx.subcategory && (
                            <span className="text-slate-400 hidden md:inline"> / {tx.subcategory}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell text-slate-500">
                      {bankLabel(tx.invoice?.bank ?? null)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono tabular-nums">
                      <span className={tx.type === 'CREDIT' ? 'text-emerald-600 font-medium' : 'text-slate-800'}>
                        {tx.type === 'CREDIT' ? '+' : ''}{formatBRL(Number(tx.amount))}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 whitespace-nowrap">
            {total} transações · página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              ← Anterior
            </button>
            <span className="text-xs text-slate-500 px-2 whitespace-nowrap tabular-nums">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Próxima →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
