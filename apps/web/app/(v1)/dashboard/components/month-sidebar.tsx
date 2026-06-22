'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { bankColor, bankLabel } from '../../../../lib/banks';
import { formatMonth } from '../../../../lib/format';
import { useBankFilter } from '../../../../hooks/use-bank-filter';

interface MonthSidebarProps {
  months: string[];
  banks: string[];
  selectedMonth: string;
  onBanksChange: (banks: string[]) => void;
}

export function MonthSidebar({ months, banks, selectedMonth, onBanksChange }: MonthSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isActive, toggle, selectedBanks } = useBankFilter(banks);

  const handleToggle = (bank: string) => {
    toggle(bank);
    const next = isActive(bank)
      ? selectedBanks.filter((b) => b !== bank)
      : [...selectedBanks, bank];
    onBanksChange(next);
  };

  const selectMonth = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', month);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <aside className="w-48 flex-shrink-0 bg-white border-r border-slate-200 fixed left-0 bottom-0 overflow-y-auto py-5 px-3 hidden lg:block" style={{ top: 'calc(3.5rem + 2.75rem)' }}>
      <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase px-3 mb-1.5">Meses</p>
      <nav className="space-y-0.5 mb-5">
        {months.map((month) => (
          <button
            key={month}
            onClick={() => selectMonth(month)}
            className={`w-full text-left block px-3 py-2 rounded-lg text-sm transition-colors ${
              month === selectedMonth
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {formatMonth(`${month}-01`)}
          </button>
        ))}
      </nav>

      <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase px-3 mb-1.5">Bancos</p>
      <div className="space-y-0.5">
        {banks.map((bank) => (
          <label key={bank} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive(bank)}
              onChange={() => handleToggle(bank)}
              className="accent-indigo-600 w-3.5 h-3.5"
            />
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: bankColor(bank) }} />
            <span className="text-sm text-slate-700">{bankLabel(bank)}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}
