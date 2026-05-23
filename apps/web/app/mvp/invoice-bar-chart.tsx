'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Invoice = {
  id: string;
  billingMonth: string;
  status: string;
  total: number;
};

type Props = { invoices: Invoice[] };

export function InvoiceBarChart({ invoices }: Props) {
  const data = invoices
    .filter((inv) => inv.status === 'DONE')
    .sort(
      (a, b) =>
        new Date(a.billingMonth).getTime() - new Date(b.billingMonth).getTime(),
    )
    .map((inv) => ({
      month: new Date(inv.billingMonth).toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
      total: inv.total,
    }));

  if (data.length < 2) return null;

  return (
    <section className="bg-white rounded-xl border p-6 mb-6">
      <h2 className="font-semibold mb-4 text-gray-900">Gastos por mês</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            width={52}
          />
          <Tooltip
            formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Total']}
            contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
