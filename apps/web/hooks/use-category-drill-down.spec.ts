/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useCategoryDrillDown } from './use-category-drill-down';

const byCategory = [
  { category: 'Alimentação', subcategory: 'Restaurantes', amount: 800 },
  { category: 'Alimentação', subcategory: 'Supermercado', amount: 400 },
  { category: 'Transporte', subcategory: 'Uber / 99 / Taxi', amount: 300 },
  { category: 'Transporte', subcategory: null, amount: 100 },
];

describe('useCategoryDrillDown', () => {
  it('starts in categories view', () => {
    const { result } = renderHook(() => useCategoryDrillDown(byCategory));
    expect(result.current.view).toBe('categories');
    expect(result.current.activeCategory).toBeNull();
  });

  it('items aggregates amounts by category in categories view', () => {
    const { result } = renderHook(() => useCategoryDrillDown(byCategory));
    const alimentacao = result.current.items.find((i) => i.label === 'Alimentação');
    const transporte = result.current.items.find((i) => i.label === 'Transporte');
    expect(alimentacao?.amount).toBe(1200);
    expect(transporte?.amount).toBe(400);
  });

  it('drillInto switches to subcategories view and sets activeCategory', () => {
    const { result } = renderHook(() => useCategoryDrillDown(byCategory));
    act(() => { result.current.drillInto('Alimentação'); });
    expect(result.current.view).toBe('subcategories');
    expect(result.current.activeCategory).toBe('Alimentação');
  });

  it('items returns only subcategories of activeCategory after drill-down', () => {
    const { result } = renderHook(() => useCategoryDrillDown(byCategory));
    act(() => { result.current.drillInto('Alimentação'); });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.every((i) => i.label !== 'Transporte')).toBe(true);
  });

  it('reset returns to categories view and clears activeCategory', () => {
    const { result } = renderHook(() => useCategoryDrillDown(byCategory));
    act(() => { result.current.drillInto('Transporte'); });
    act(() => { result.current.reset(); });
    expect(result.current.view).toBe('categories');
    expect(result.current.activeCategory).toBeNull();
  });
});
