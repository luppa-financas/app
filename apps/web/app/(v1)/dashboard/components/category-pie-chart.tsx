'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCategoryDrillDown, CategoryItem } from '../../../../hooks/use-category-drill-down';
import { formatBRL } from '../../../../lib/format';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#8b5cf6', '#06b6d4', '#e11d48'];

interface CategoryPieChartProps {
  byCategory: CategoryItem[];
}

export function CategoryPieChart({ byCategory }: CategoryPieChartProps) {
  const { view, items, activeCategory, drillInto, reset } = useCategoryDrillDown(byCategory);

  const debitItems = items.filter((item) => item.amount > 0);
  const creditItems = items.filter((item) => item.amount <= 0);
  const debitTotal = debitItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Por categoria</p>
        {view === 'subcategories' && (
          <button onClick={reset} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            ← {activeCategory}
          </button>
        )}
      </div>

      {view === 'categories' && (
        <p className="text-[10px] text-slate-400 mb-2 hidden sm:block">Clique numa fatia para ver subcategorias</p>
      )}

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={debitItems}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={2}
            onClick={view === 'categories' ? (entry) => drillInto(entry.name as string) : undefined}
            style={{ cursor: view === 'categories' ? 'pointer' : 'default' }}
          >
            {debitItems.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatBRL(Number(value)), String(name)]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {debitItems.map((item, i) => (
          <li
            key={item.label}
            onClick={view === 'categories' ? () => drillInto(item.label) : undefined}
            className={`flex items-center gap-1.5 text-xs min-w-0 ${view === 'categories' ? 'cursor-pointer hover:opacity-70' : ''}`}
          >
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-slate-600 truncate">{item.label}</span>
            <span className="text-slate-400 tabular-nums flex-shrink-0 ml-0.5">
              {debitTotal > 0 ? `${((item.amount / debitTotal) * 100).toFixed(0)}%` : '—'}
            </span>
          </li>
        ))}
        {creditItems.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-xs min-w-0">
            <span className="w-2 h-2 rounded-sm flex-shrink-0 bg-emerald-400" />
            <span className="text-slate-500 truncate">{item.label}</span>
            <span className="text-emerald-600 tabular-nums flex-shrink-0 ml-0.5 font-medium">
              +{formatBRL(Math.abs(item.amount))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
