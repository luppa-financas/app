/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvoicePolling } from './use-invoice-polling';

// getToken must be a stable reference — a new jest.fn() per render causes infinite re-renders
const mockGetToken = jest.fn().mockResolvedValue('test-token');
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3333';
const API = 'http://localhost:3333';

function pending() {
  return { ok: true, json: () => Promise.resolve({ id: 'inv-1', status: 'PENDING' }) };
}

function terminal(status: 'DONE' | 'FAILED' | 'NEEDS_REVIEW') {
  return { ok: true, json: () => Promise.resolve({ id: 'inv-1', status }) };
}

describe('useInvoicePolling', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockGetToken.mockResolvedValue('test-token');
  });

  // --- Block 1: Basic polling ---

  it('calls GET /invoices/:id on mount with auth token', async () => {
    mockFetch.mockResolvedValue(terminal('DONE'));

    renderHook(() => useInvoicePolling('inv-1'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `${API}/invoices/inv-1`,
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
      );
    });
  });

  it('returns status, invoice and isPolling from response', async () => {
    mockFetch.mockResolvedValue(pending());

    const { result } = renderHook(() => useInvoicePolling('inv-1'));

    await waitFor(() => expect(result.current.status).toBe('PENDING'));
    expect(result.current.invoice).toMatchObject({ id: 'inv-1' });
    expect(result.current.isPolling).toBe(true);
  });

  // --- Block 2: Backoff sequence ---

  it('schedules next poll with 3000ms initial interval after PENDING response', async () => {
    mockFetch.mockResolvedValue(pending());
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');

    const { result } = renderHook(() => useInvoicePolling('inv-1'));

    // Wait for state to update, then check that the hook scheduled a 3000ms timer
    // (waitFor itself uses setTimeout with small delays — filter those out)
    await waitFor(() => expect(result.current.status).toBe('PENDING'));
    const hookTimer = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 3000);
    expect(hookTimer).toBeDefined();
  });

  // --- Block 3: Terminal status ---

  it.each(['DONE', 'FAILED', 'NEEDS_REVIEW'] as const)(
    'stops polling and sets isPolling=false when status is %s',
    async (status) => {
      mockFetch.mockResolvedValue(terminal(status));

      const { result } = renderHook(() => useInvoicePolling('inv-1'));

      await waitFor(() => expect(result.current.status).toBe(status));
      expect(result.current.isPolling).toBe(false);
      // fetch should only have been called once — no extra polls
      expect(mockFetch).toHaveBeenCalledTimes(1);
    },
  );

  // --- Block 4: Cleanup ---

  it('cancels pending timer on unmount', async () => {
    mockFetch.mockResolvedValue(pending());
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

    const { unmount } = renderHook(() => useInvoicePolling('inv-1'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    act(() => { unmount(); });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('does not call fetch again after unmount', async () => {
    mockFetch.mockResolvedValue(terminal('DONE'));

    const { unmount, result } = renderHook(() => useInvoicePolling('inv-1'));
    await waitFor(() => expect(result.current.status).toBe('DONE'));

    act(() => { unmount(); });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
