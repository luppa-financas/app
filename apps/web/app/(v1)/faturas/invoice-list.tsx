'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { formatBRL, formatMonth } from '../../../lib/format';
import { bankColor, bankLabel } from '../../../lib/banks';

type InvoiceStatus = 'PENDING' | 'DONE' | 'FAILED' | 'NEEDS_REVIEW';

export type InvoiceListItem = {
  id: string;
  filename: string;
  status: InvoiceStatus;
  bank: string | null;
  billingMonth: string | null;
  total: number;
  transactionCount: number;
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'Processando',
  DONE: 'Processada',
  FAILED: 'Falha',
  NEEDS_REVIEW: 'Revisar',
};

const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  DONE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800',
};

function BankDot({ bank }: { bank: string | null }) {
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0 inline-block"
      style={{ backgroundColor: bankColor(bank) }}
    />
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function InvoiceList({ invoices: initialInvoices }: { invoices: InvoiceListItem[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { getToken } = useAuth();

  async function handleDelete(id: string) {
    setDeleting(id);
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }
    setDeleting(null);
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Nenhuma fatura importada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <div
          key={inv.id}
          className="bg-white rounded-xl border border-slate-200 border-l-4 flex items-center justify-between px-5 py-3.5"
          style={{ borderLeftColor: bankColor(inv.bank) }}
        >
          <div className="flex items-center gap-3">
            <BankDot bank={inv.bank} />
            <div>
              <p className="text-sm font-medium text-slate-800">{bankLabel(inv.bank) !== '—' ? bankLabel(inv.bank) : inv.filename}</p>
              <p className="text-xs text-slate-400">
                {formatMonth(inv.billingMonth)}
                {inv.status === 'DONE' && ` · ${inv.transactionCount} transações`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={inv.status} />
            {inv.status === 'DONE' && (
              <p className="font-mono text-sm text-slate-700">{formatBRL(inv.total)}</p>
            )}
            <button
              onClick={() => handleDelete(inv.id)}
              disabled={deleting === inv.id}
              className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Excluir fatura"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
