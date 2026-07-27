/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useEditTransaction } from './use-edit-transaction';

jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: jest.fn().mockResolvedValue('test-token') }),
}));

const tx = {
  id: 'tx-1',
  description: 'IFOOD*123',
  category: 'Alimentação',
  subcategory: 'Delivery',
  alias: 'iFood',
};

describe('useEditTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
  });

  it('starts closed with idle status', () => {
    const { result } = renderHook(() => useEditTransaction());
    expect(result.current.transaction).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('matchCount starts null and applyToAll starts false', () => {
    const { result } = renderHook(() => useEditTransaction());
    expect(result.current.matchCount).toBeNull();
    expect(result.current.applyToAll).toBe(false);
    expect(result.current.bulkConfirmOpen).toBe(false);
  });

  it('open() sets transaction and pre-fills form fields', async () => {
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    expect(result.current.transaction).toEqual(tx);
    expect(result.current.category).toBe('Alimentação');
    expect(result.current.subcategory).toBe('Delivery');
    expect(result.current.nickname).toBe('iFood');
  });

  it('open() uses empty string for null fields', async () => {
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => {
      result.current.open({ id: 'tx-2', description: 'DESC', category: null, subcategory: null, alias: null });
    });
    expect(result.current.category).toBe('');
    expect(result.current.subcategory).toBe('');
    expect(result.current.nickname).toBe('');
  });

  it('open() fetches count and sets matchCount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ count: 5 }),
    });
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transactions/count?description='),
      expect.any(Object),
    );
    expect(result.current.matchCount).toBe(5);
  });

  it('close() sets transaction to null and resets bulk state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ count: 3 }),
    });
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    act(() => { result.current.setApplyToAll(true); });
    act(() => { result.current.close(); });
    expect(result.current.transaction).toBeNull();
    expect(result.current.matchCount).toBeNull();
    expect(result.current.applyToAll).toBe(false);
    expect(result.current.bulkConfirmOpen).toBe(false);
  });

  it('setCategory() resets subcategory', async () => {
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    act(() => { result.current.setCategory('Transporte'); });
    expect(result.current.category).toBe('Transporte');
    expect(result.current.subcategory).toBe('');
  });

  it('requestBulk() opens confirm dialog and cancelBulk() closes it', async () => {
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    expect(result.current.bulkConfirmOpen).toBe(false);
    act(() => { result.current.requestBulk(); });
    expect(result.current.bulkConfirmOpen).toBe(true);
    act(() => { result.current.cancelBulk(); });
    expect(result.current.bulkConfirmOpen).toBe(false);
  });

  it('save() calls PUT /transactions/:id with correct body', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // count fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...tx, alias: 'novo' }),
      });
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    act(() => { result.current.setNickname('novo'); });
    await act(async () => { await result.current.save(jest.fn()); });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transactions/tx-1'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ category: 'Alimentação', subcategory: 'Delivery', nickname: 'novo' }),
      }),
    );
  });

  it('save() success calls onSave with updated transaction and closes modal', async () => {
    const updated = { ...tx, alias: 'novo' };
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // count fetch
      .mockResolvedValueOnce({ ok: true, json: async () => updated });
    const onSave = jest.fn();
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    await act(async () => { await result.current.save(onSave); });
    expect(onSave).toHaveBeenCalledWith(updated);
    expect(result.current.transaction).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('save() API error keeps modal open and sets error status', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // count fetch
      .mockResolvedValueOnce({ ok: false, status: 422 });
    const onSave = jest.fn();
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    await act(async () => { await result.current.save(onSave); });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.transaction).toEqual(tx);
    expect(result.current.status).toBe('error');
  });

  it('confirmBulk() calls POST /transactions/bulk-categorize with correct body', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // count fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ updatedCount: 3 }) });
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    await act(async () => { await result.current.confirmBulk(jest.fn()); });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/transactions/bulk-categorize'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ description: 'IFOOD*123', category: 'Alimentação', subcategory: 'Delivery' }),
      }),
    );
  });

  it('confirmBulk() success calls onBulkSave and closes modal', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // count fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ updatedCount: 3 }) });
    const onBulkSave = jest.fn();
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    await act(async () => { await result.current.confirmBulk(onBulkSave); });
    expect(onBulkSave).toHaveBeenCalled();
    expect(result.current.transaction).toBeNull();
    expect(result.current.bulkConfirmOpen).toBe(false);
    expect(result.current.status).toBe('idle');
  });

  it('confirmBulk() API error sets error status', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false }) // count fetch
      .mockResolvedValueOnce({ ok: false, status: 500 });
    const onBulkSave = jest.fn();
    const { result } = renderHook(() => useEditTransaction());
    await act(async () => { result.current.open(tx); });
    await act(async () => { await result.current.confirmBulk(onBulkSave); });
    expect(onBulkSave).not.toHaveBeenCalled();
    expect(result.current.status).toBe('error');
  });
});
