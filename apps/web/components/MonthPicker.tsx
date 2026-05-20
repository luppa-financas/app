'use client';

import { useEffect, useRef, useState } from 'react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Props = {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function MonthPicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => parseInt(value.split('-')[0]));
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedYear = parseInt(value.split('-')[0]);
  const selectedMonth = parseInt(value.split('-')[1]) - 1;

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function toggle() {
    if (disabled) return;
    setYear(selectedYear);
    setOpen((o) => !o);
  }

  function select(monthIndex: number) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    onChange(`${year}-${mm}`);
    setOpen(false);
  }

  const label = `${MONTHS[selectedMonth]} de ${selectedYear}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition disabled:opacity-50 whitespace-nowrap"
      >
        <CalendarIcon />
        {label}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border rounded-xl shadow-lg p-4 w-60">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition text-base leading-none"
              aria-label="Ano anterior"
            >
              ‹
            </button>
            <span className="font-semibold text-sm text-gray-900">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition text-base leading-none"
              aria-label="Próximo ano"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((month, i) => {
              const isSelected = year === selectedYear && i === selectedMonth;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => select(i)}
                  className={`text-sm rounded-lg py-2 transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="1" y="3" width="14" height="12" rx="2" />
      <path d="M1 7h14M5 1v4M11 1v4" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}
