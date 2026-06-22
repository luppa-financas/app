import { useState, useCallback, useMemo } from 'react';

export interface CategoryItem {
  category: string | null;
  subcategory: string | null;
  amount: number;
}

export interface DrillDownItem {
  label: string;
  amount: number;
}

export interface UseCategoryDrillDownReturn {
  view: 'categories' | 'subcategories';
  activeCategory: string | null;
  items: DrillDownItem[];
  drillInto: (category: string) => void;
  reset: () => void;
}

export function useCategoryDrillDown(byCategory: CategoryItem[]): UseCategoryDrillDownReturn {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const { category, amount } of byCategory) {
      const key = category ?? 'Outros';
      map.set(key, (map.get(key) ?? 0) + amount);
    }
    return Array.from(map.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [byCategory]);

  const subcategoryItems = useMemo(() => {
    if (!activeCategory) return [];
    return byCategory
      .filter((i) => i.category === activeCategory)
      .map((i) => ({ label: i.subcategory ?? 'Outros', amount: i.amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [byCategory, activeCategory]);

  const drillInto = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const reset = useCallback(() => {
    setActiveCategory(null);
  }, []);

  return {
    view: activeCategory ? 'subcategories' : 'categories',
    activeCategory,
    items: activeCategory ? subcategoryItems : categoryTotals,
    drillInto,
    reset,
  };
}
