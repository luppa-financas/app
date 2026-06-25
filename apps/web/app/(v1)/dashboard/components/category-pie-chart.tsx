'use client';

import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useCategoryDrillDown, CategoryItem } from '../../../../hooks/use-category-drill-down';
import { formatBRL } from '../../../../lib/format';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#818cf8', '#4f46e5', '#7c3aed', '#9333ea'];

interface CategoryPieChartProps {
  byCategory: CategoryItem[];
}

export function CategoryPieChart({ byCategory }: CategoryPieChartProps) {
  const { view, items, activeCategory, drillInto, reset } = useCategoryDrillDown(byCategory);

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Por categoria</p>
        {view === 'subcategories' && (
          <button onClick={reset} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            ← {activeCategory}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <PieChart width={140} height={140}>
            <Pie
              data={items}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={2}
              onClick={view === 'categories' ? (entry) => drillInto(entry.name as string) : undefined}
              style={{ cursor: view === 'categories' ? 'pointer' : 'default' }}
            >
              {items.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatBRL(Number(value)), String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </PieChart>
        </div>

        <ul className="flex-1 min-w-0 space-y-1.5 max-h-[132px] overflow-y-auto">
          {items.map((item, i) => (
            <li
              key={item.label}
              onClick={view === 'categories' ? () => drillInto(item.label) : undefined}
              className={`flex items-center gap-2 text-xs min-w-0 ${view === 'categories' ? 'cursor-pointer hover:opacity-80' : ''}`}
            >
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-slate-600 truncate flex-1">{item.label}</span>
              <span className="text-slate-400 tabular-nums flex-shrink-0">
                {total > 0 ? `${((item.amount / total) * 100).toFixed(0)}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
