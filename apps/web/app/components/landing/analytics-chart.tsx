'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const DATA = [
  { month: 'Dez', Itaú: 7200, Nubank: 950, Bradesco: 3100 },
  { month: 'Jan', Itaú: 8900, Nubank: 1200, Bradesco: 4100 },
  { month: 'Fev', Itaú: 6800, Nubank: 880, Bradesco: 3500 },
  { month: 'Mar', Itaú: 9100, Nubank: 1050, Bradesco: 4300 },
  { month: 'Abr', Itaú: 7500, Nubank: 1100, Bradesco: 3700 },
  { month: 'Mai', Itaú: 8102, Nubank: 1138, Bradesco: 3992 },
];

const BANKS: Array<{ key: 'Itaú' | 'Nubank' | 'Bradesco'; color: string }> = [
  { key: 'Itaú', color: '#FF6B00' },
  { key: 'Nubank', color: '#820AD1' },
  { key: 'Bradesco', color: '#CC0000' },
];

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR')}`;
const yTick = (v: number) => `R$${(v / 1000).toFixed(0)}k`;

export function AnalyticsChart() {
  return (
    <>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
        Histórico — últimos 6 meses
      </p>
      <div className="flex items-center gap-4 mb-4">
        {BANKS.map((bank) => (
          <span key={bank.key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: bank.color }} />
            {bank.key}
          </span>
        ))}
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} margin={{ top: 0, right: 0, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#F8FAFC" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'var(--font-mono)' }}
              tickFormatter={yTick}
            />
            <Tooltip
              cursor={{ fill: '#F8FAFC' }}
              formatter={(value, name) => [fmt(Number(value)), name]}
              contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
            />
            {BANKS.map((bank) => (
              <Bar key={bank.key} dataKey={bank.key} stackId="bank" fill={bank.color} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
