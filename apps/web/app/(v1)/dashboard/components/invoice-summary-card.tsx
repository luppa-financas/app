import { bankColor, bankLabel } from '../../../../lib/banks';
import { formatBRL, formatMonth } from '../../../../lib/format';

interface InvoiceSummaryCardProps {
  id: string;
  bank: string | null;
  billingMonth: string | null;
  total: number;
  transactionCount: number;
  onClick: (id: string) => void;
}

export function InvoiceSummaryCard({ id, bank, billingMonth, total, transactionCount, onClick }: InvoiceSummaryCardProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className="bg-white rounded-2xl border border-slate-200 border-l-4 p-5 cursor-pointer hover:shadow-md transition-all group text-left w-full"
      style={{ borderLeftColor: bankColor(bank) }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">{bankLabel(bank)} · {formatMonth(billingMonth ? `${billingMonth.slice(0, 7)}-01` : null)}</p>
          <p className="text-xs text-slate-400">{transactionCount} transações</p>
        </div>
        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="font-mono text-2xl font-medium text-slate-800">{formatBRL(total)}</p>
    </button>
  );
}
