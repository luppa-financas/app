'use client';

import { useState } from 'react';
import { bankLabel, bankColor } from '../../../../lib/banks';
import { formatBRL, formatMonth } from '../../../../lib/format';
import { useInvoiceDetail } from '../../../../hooks/use-invoice-detail';

interface Transaction {
  id: string;
  date: string;
  description: string;
  alias: string | null;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
}

interface InvoiceDetail {
  id: string;
  bank: string | null;
  billingMonth: string | null;
  invoiceTotal: number | null;
  transactions: Transaction[];
}

export function useInvoiceDetailPanel() {
  return useInvoiceDetail();
}

interface InvoiceDetailPanelProps {
  isOpen: boolean;
  invoice: unknown | null;
  onClose: () => void;
}

export function InvoiceDetailPanel({ isOpen, invoice: rawInvoice, onClose }: InvoiceDetailPanelProps) {
  const [search, setSearch] = useState('');
  const invoice = rawInvoice as InvoiceDetail | null;

  const transactions = (invoice?.transactions ?? []).filter((t) => {
    if (!search) return true;
    return (t.alias ?? t.description).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-20" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-30 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bankColor(invoice?.bank ?? null) }} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{bankLabel(invoice?.bank ?? null)}</p>
              <p className="text-xs text-slate-400">{formatMonth(invoice?.billingMonth ? `${invoice.billingMonth.slice(0, 7)}-01` : null)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 h-9">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar transação…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm text-slate-800 w-full outline-none bg-transparent placeholder-slate-400"
            />
          </div>
        </div>

        {/* Transactions */}
        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Nenhuma transação encontrada.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 mr-4">
                    <p className="text-sm text-slate-800 truncate">{t.alias ?? t.description}</p>
                    <p className="text-xs text-slate-400">{t.category} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className={`font-mono text-sm font-medium flex-shrink-0 ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {t.type === 'CREDIT' ? '+' : ''}{formatBRL(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer total */}
        {invoice?.invoiceTotal != null && (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-slate-400">Total da fatura</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{formatBRL(invoice.invoiceTotal)}</p>
          </div>
        )}
      </div>
    </>
  );
}
