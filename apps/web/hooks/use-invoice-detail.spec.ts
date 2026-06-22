/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvoiceDetail } from './use-invoice-detail';

const mockGetToken = jest.fn().mockResolvedValue('test-token');
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3333';

const invoice = {
  id: 'inv-1',
  filename: 'fatura.pdf',
  status: 'DONE',
  bank: 'itau',
  billingMonth: '2026-05-01T00:00:00.000Z',
  invoiceTotal: 8102.44,
  transactions: [],
};

describe('useInvoiceDetail', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetToken.mockResolvedValue('test-token');
  });

  it('starts closed with no invoice', () => {
    const { result } = renderHook(() => useInvoiceDetail());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.invoice).toBeNull();
  });

  it('open fetches invoice and opens the panel', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invoice),
    });
    const { result } = renderHook(() => useInvoiceDetail());

    await act(async () => { result.current.open('inv-1'); });

    await waitFor(() => expect(result.current.isOpen).toBe(true));
    expect(result.current.invoice).toMatchObject({ id: 'inv-1', bank: 'itau' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3333/invoices/inv-1',
      expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }),
    );
  });

  it('close clears invoice and closes the panel', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invoice),
    });
    const { result } = renderHook(() => useInvoiceDetail());
    await act(async () => { result.current.open('inv-1'); });
    await waitFor(() => expect(result.current.isOpen).toBe(true));

    act(() => { result.current.close(); });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.invoice).toBeNull();
  });

  it('fetch error sets error and does not open panel', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { result } = renderHook(() => useInvoiceDetail());

    await act(async () => { result.current.open('inv-missing'); });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.invoice).toBeNull();
  });
});
