'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { bankColor, bankLabel } from '../../../../lib/banks';
import { formatMonth } from '../../../../lib/format';

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
  const chartData = data.map((item) => ({
    month: formatMonth(`${item.month}-01`).replace(/\s\d{4}$/, ''),
    ...item.byBank,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barSize={20} barCategoryGap="30%">
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatK} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          formatter={(value, name) => [
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)),
            bankLabel(String(name)),
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend formatter={(name) => bankLabel(name)} wrapperStyle={{ fontSize: 12 }} />
        {selectedBanks.map((bank) => (
          <Bar key={bank} dataKey={bank} stackId="a" fill={bankColor(bank)} radius={selectedBanks[selectedBanks.length - 1] === bank ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
