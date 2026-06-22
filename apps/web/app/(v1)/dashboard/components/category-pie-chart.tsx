'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCategoryDrillDown, CategoryItem } from '../../../../hooks/use-category-drill-down';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#818cf8', '#4f46e5', '#7c3aed', '#9333ea'];

interface CategoryPieChartProps {
  byCategory: CategoryItem[];
}

export function CategoryPieChart({ byCategory }: CategoryPieChartProps) {
  const { view, items, activeCategory, drillInto, reset } = useCategoryDrillDown(byCategory);

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
      {view === 'categories' && (
        <p className="text-[10px] text-slate-400 mb-2 hidden sm:block">Clique numa fatia para ver subcategorias</p>
      )}
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={items}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={72}
            paddingAngle={2}
            onClick={view === 'categories' ? (entry) => drillInto(entry.name as string) : undefined}
            style={{ cursor: view === 'categories' ? 'pointer' : 'default' }}
          >
            {items.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)),
              String(name),
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
