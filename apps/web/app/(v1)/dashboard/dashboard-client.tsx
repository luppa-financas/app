'use client';

import { useState } from 'react';
import { MonthSidebar } from './components/month-sidebar';
import { MonthlyBarChart } from './components/monthly-bar-chart';
import { CategoryPieChart } from './components/category-pie-chart';
import { InvoiceSummaryCard } from './components/invoice-summary-card';
import { InvoiceDetailPanel } from './components/invoice-detail-panel';
import { useInvoiceDetail } from '../../../hooks/use-invoice-detail';
import { formatBRL, formatMonth } from '../../../lib/format';

interface HistoryItem {
  month: string;
  byBank: Record<string, number>;
}

interface CategoryRow {
  category: string | null;
  subcategory: string | null;
  amount: number;
}

interface InvoiceCard {
  id: string;
  bank: string | null;
  billingMonth: string | null;
  total: number;
  transactionCount: number;
}

interface DashboardClientProps {
  history: HistoryItem[];
  byCategory: CategoryRow[];
  invoices: InvoiceCard[];
  grandTotal: number;
  selectedMonth: string;
  months: string[];
  banks: string[];
}

export function DashboardClient({
  history,
  byCategory,
  invoices,
  grandTotal,
  selectedMonth,
  months,
  banks,
}: DashboardClientProps) {
  const [selectedBanks, setSelectedBanks] = useState<string[]>(banks);
  const { isOpen, invoice, open, close } = useInvoiceDetail();

  const filteredHistory = history.map((item) => ({
    ...item,
    byBank: Object.fromEntries(
      Object.entries(item.byBank).filter(([bank]) => selectedBanks.includes(bank)),
    ),
  }));

  const filteredInvoices = invoices.filter(
    (inv) => !inv.bank || selectedBanks.includes(inv.bank),
  );

  const filteredTotal = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="flex">
      <MonthSidebar
        months={months}
        banks={banks}
        selectedMonth={selectedMonth}
        onBanksChange={setSelectedBanks}
      />

      <div className="flex-1 lg:ml-48 p-5 lg:p-7 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
            {formatMonth(`${selectedMonth}-01`)}
          </p>
          <p className="font-mono text-4xl font-medium text-slate-900">{formatBRL(filteredTotal)}</p>
          {grandTotal > 0 && filteredTotal !== grandTotal && (
            <p className="text-xs text-slate-400 mt-1">de {formatBRL(grandTotal)} total</p>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Histórico — últimos 6 meses
            </p>
            <MonthlyBarChart data={filteredHistory} selectedBanks={selectedBanks} />
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
            <CategoryPieChart byCategory={byCategory} />
          </div>
        </div>

        {/* Invoice cards */}
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Faturas · {formatMonth(`${selectedMonth}-01`)}
        </p>
        {filteredInvoices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhuma fatura para este período.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {filteredInvoices.map((inv) => (
              <InvoiceSummaryCard
                key={inv.id}
                {...inv}
                onClick={open}
              />
            ))}
          </div>
        )}
      </div>

      <InvoiceDetailPanel isOpen={isOpen} invoice={invoice} onClose={close} />
    </div>
  );
}
