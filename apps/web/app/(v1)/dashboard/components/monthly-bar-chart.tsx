'use client';

import { BarChart, Bar, LabelList, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { bankColor, bankLabel } from '../../../../lib/banks';
import { formatBRL } from '../../../../lib/format';

interface HistoryItem {
  month: string;
  byBank: Record<string, number>;
}

interface MonthlyBarChartProps {
  data: HistoryItem[];
  selectedBanks: string[];
}

function formatK(value: number) {
  return value >= 1000 ? `R$${(value / 1000).toFixed(0)}k` : `R$${value}`;
}

export function MonthlyBarChart({ data, selectedBanks }: MonthlyBarChartProps) {
  const chartData = data.map((item) => {
    const date = new Date(`${item.month}-01T12:00:00`);
    const shortMonth = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const shortYear = date.getFullYear().toString().slice(2);
    const _total = selectedBanks.reduce((sum, bank) => sum + (item.byBank[bank] ?? 0), 0);
    return { month: `${shortMonth}/${shortYear}`, ...item.byBank, _total };
  });

  const periodTotal = data.reduce(
    (sum, item) => sum + selectedBanks.reduce((s, bank) => s + (item.byBank[bank] ?? 0), 0),
    0,
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-4">
          {selectedBanks.map((bank) => (
            <span key={bank} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: bankColor(bank) }} />
              {bankLabel(bank)}
            </span>
          ))}
        </div>
        {periodTotal > 0 && (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Total <span className="font-semibold text-slate-700 font-mono">{formatBRL(periodTotal)}</span>
          </span>
        )}
      </div>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <BarChart data={chartData} barSize={20} barCategoryGap="30%" margin={{ top: 28 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              formatter={(value, name) => [
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)),
                bankLabel(String(name)),
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              labelStyle={{ color: '#1e293b', fontWeight: 600 }}
            />
            {selectedBanks.map((bank) => {
              const isLast = selectedBanks[selectedBanks.length - 1] === bank;
              return (
                <Bar key={bank} dataKey={bank} stackId="a" fill={bankColor(bank)} radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                  {isLast && (
                    <LabelList dataKey="_total" position="top" formatter={(v: number) => formatBRL(v)} style={{ fontSize: 10, fill: '#64748b' }} />
                  )}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
