/**
 * @jest-environment jsdom
 */

// jsdom does not implement Blob.arrayBuffer — polyfill via FileReader
if (typeof Blob.prototype.arrayBuffer === 'undefined') {
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvoiceUpload } from './use-invoice-upload';

const mockGetToken = jest.fn().mockResolvedValue('test-token');
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockDetectEncryptedPdf = jest.fn().mockReturnValue(false);
jest.mock('../lib/pdf-crypto', () => ({
  detectEncryptedPdf: (...args: unknown[]) => mockDetectEncryptedPdf(...args),
}));

const mockUseInvoicePolling = jest.fn().mockReturnValue({
  status: null,
  invoice: null,
  isPolling: false,
});
jest.mock('./use-invoice-polling', () => ({
  useInvoicePolling: (...args: unknown[]) => mockUseInvoicePolling(...args),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3333';

function makePdf(name = 'fatura.pdf') {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
    type: 'application/pdf',
  });
}

function uploadOk(invoiceId = 'inv-1') {
  return { ok: true, status: 200, json: () => Promise.resolve({ invoiceId }) };
}

function pollingResult(
  id: string | null,
  status: string | null,
  invoice: object | null = null,
) {
  return (calledId: string | null) =>
    calledId === id
      ? { status, invoice, isPolling: false }
      : { status: null, invoice: null, isPolling: false };
}

describe('useInvoiceUpload', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetToken.mockResolvedValue('test-token');
    mockDetectEncryptedPdf.mockReturnValue(false);
    mockUseInvoicePolling.mockReturnValue({
      status: null,
      invoice: null,
      isPolling: false,
    });
    mockFetch.mockResolvedValue(uploadOk());
  });

  it('transitions to error-format when file is not a PDF', async () => {
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(new File(['x'], 'doc.txt', { type: 'text/plain' }));
    });

    expect(result.current.state.kind).toBe('error-format');
  });

  it('transitions to error-password when PDF is encrypted', async () => {
    mockDetectEncryptedPdf.mockReturnValue(true);
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(makePdf());
    });

    expect(result.current.state.kind).toBe('error-password');
  });

  it('uploads valid PDF and transitions to processing with invoiceId', async () => {
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(makePdf());
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3333/invoices',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.state.kind).toBe('processing');
    if (result.current.state.kind === 'processing') {
      expect(result.current.state.invoiceId).toBe('inv-1');
    }
  });

  it.each([
    [409, 'error-duplicate'],
    [500, 'error-extraction'],
  ])('server HTTP %i → state %s', async (httpStatus, expectedKind) => {
    mockFetch.mockResolvedValue({ ok: false, status: httpStatus, json: jest.fn() });
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(makePdf());
    });

    expect(result.current.state.kind).toBe(expectedKind);
  });

  it('transitions to confirm with invoice data when polling returns DONE', async () => {
    const invoice = { bank: 'nubank', billingMonth: '2026-05', invoiceTotal: 1200 };
    mockUseInvoicePolling.mockImplementation(
      pollingResult('inv-1', 'DONE', invoice),
    );
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(makePdf());
    });

    await waitFor(() => expect(result.current.state.kind).toBe('confirm'));
    if (result.current.state.kind === 'confirm') {
      expect(result.current.state.bank).toBe('nubank');
      expect(result.current.state.billingMonth).toBe('2026-05');
      expect(result.current.state.total).toBe(1200);
    }
  });

  it('transitions to error-extraction when polling returns FAILED', async () => {
    mockUseInvoicePolling.mockImplementation(
      pollingResult('inv-1', 'FAILED'),
    );
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(makePdf());
    });

    await waitFor(() => expect(result.current.state.kind).toBe('error-extraction'));
  });

  it('transitions to success and calls router.refresh on confirmAndFinish', async () => {
    const invoice = { bank: 'itau', billingMonth: '2026-04', invoiceTotal: 800 };
    mockUseInvoicePolling.mockImplementation(
      pollingResult('inv-1', 'DONE', invoice),
    );
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(makePdf());
    });
    await waitFor(() => expect(result.current.state.kind).toBe('confirm'));

    act(() => {
      result.current.confirmAndFinish();
    });

    expect(result.current.state.kind).toBe('success');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('resets to idle and clears password', async () => {
    const { result } = renderHook(() => useInvoiceUpload());

    await act(async () => {
      await result.current.handleFile(new File(['x'], 'doc.txt'));
    });
    expect(result.current.state.kind).toBe('error-format');

    act(() => { result.current.setPassword('abc123'); });
    expect(result.current.password).toBe('abc123');

    act(() => { result.current.reset(); });

    expect(result.current.state.kind).toBe('idle');
    expect(result.current.password).toBe('');
  });
});
