'use client';

import { formatBRL, formatMonth } from '../../../lib/format';

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

const BANK_COLORS: Record<string, string> = {
  Itaú: '#FF6B00',
  Nubank: '#820AD1',
  Bradesco: '#CC0000',
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

function getBankColor(bank: string | null): string {
  return bank ? (BANK_COLORS[bank] ?? '#94a3b8') : '#94a3b8';
}

function BankDot({ bank }: { bank: string | null }) {
  return (
    <span
      className="w-2 h-2 rounded-full flex-shrink-0 inline-block"
      style={{ backgroundColor: getBankColor(bank) }}
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

export function InvoiceList({ invoices }: { invoices: InvoiceListItem[] }) {
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
          style={{ borderLeftColor: getBankColor(inv.bank) }}
        >
          <div className="flex items-center gap-3">
            <BankDot bank={inv.bank} />
            <div>
              <p className="text-sm font-medium text-slate-800">{inv.bank ?? inv.filename}</p>
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
          </div>
        </div>
      ))}
    </div>
  );
}
