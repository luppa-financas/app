/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useTransactions } from './use-transactions';

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@clerk/nextjs';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({ data: [], total: 0, page: 1, limit: 15, ...overrides }),
  };
}

describe('useTransactions', () => {
  const mockGetToken = jest.fn().mockResolvedValue('token-abc');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ getToken: mockGetToken } as ReturnType<typeof useAuth>);
    global.fetch = jest.fn().mockResolvedValue(makeResponse());
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
  });

  async function settle() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('fetches /transactions with page=1, limit=15, sort=date, order=desc on mount', async () => {
    renderHook(() => useTransactions());
    await settle();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = new URL((global.fetch as jest.Mock).mock.calls[0][0] as string);
    expect(url.pathname).toContain('/transactions');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('15');
    expect(url.searchParams.get('sort')).toBe('date');
    expect(url.searchParams.get('order')).toBe('desc');
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe('Bearer token-abc');
  });

  it('resets page to 1 when month filter changes', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    act(() => { result.current.setPage(3); });
    expect(result.current.page).toBe(3);

    act(() => { result.current.setMonth('2026-04'); });
    expect(result.current.page).toBe(1);
  });

  it('resets page to 1 when bank filter changes', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    act(() => { result.current.setPage(2); });
    act(() => { result.current.setBank('nubank'); });
    expect(result.current.page).toBe(1);
  });

  it('resets page to 1 when q changes', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    act(() => { result.current.setPage(2); });
    act(() => { result.current.setQ('uber'); });
    expect(result.current.page).toBe(1);
  });

  it('toggleSort: same column toggles desc → asc → desc', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    expect(result.current.sort).toBe('date');
    expect(result.current.order).toBe('desc');

    act(() => { result.current.toggleSort('date'); });
    expect(result.current.sort).toBe('date');
    expect(result.current.order).toBe('asc');

    act(() => { result.current.toggleSort('date'); });
    expect(result.current.order).toBe('desc');
  });

  it('toggleSort: different column resets order to desc', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    act(() => { result.current.toggleSort('amount'); });
    expect(result.current.sort).toBe('amount');
    expect(result.current.order).toBe('desc');
  });

  it('setCategory clears subcategory and resets page', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    act(() => { result.current.setSubcategory('Delivery'); });
    act(() => { result.current.setPage(2); });
    expect(result.current.subcategory).toBe('Delivery');

    act(() => { result.current.setCategory('Transporte'); });
    expect(result.current.subcategory).toBe('');
    expect(result.current.page).toBe(1);
  });

  it('setPage changes to the requested page without resetting filters', async () => {
    const { result } = renderHook(() => useTransactions());
    await settle();

    act(() => { result.current.setMonth('2026-05'); });
    act(() => { result.current.setPage(3); });

    expect(result.current.page).toBe(3);
    expect(result.current.month).toBe('2026-05');
  });

  it('debounces search query — fetch is not called immediately on input', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });
    try {
      const { result } = renderHook(() => useTransactions());
      await act(async () => { jest.runAllImmediates(); });

      const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

      act(() => { result.current.setQ('netflix'); });
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsBefore);

      await act(async () => { jest.advanceTimersByTime(350); });
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);

      const lastUrl = (global.fetch as jest.Mock).mock.calls.at(-1)[0] as string;
      expect(lastUrl).toContain('q=netflix');
    } finally {
      jest.useRealTimers();
    }
  });
});
