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
  category: 'Alimentação',
  subcategory: 'Delivery',
  alias: 'iFood',
};

describe('useEditTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('starts closed with idle status', () => {
    const { result } = renderHook(() => useEditTransaction());
    expect(result.current.transaction).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('open() sets transaction and pre-fills form fields', () => {
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open(tx); });
    expect(result.current.transaction).toEqual(tx);
    expect(result.current.category).toBe('Alimentação');
    expect(result.current.subcategory).toBe('Delivery');
    expect(result.current.nickname).toBe('iFood');
  });

  it('open() uses empty string for null fields', () => {
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open({ id: 'tx-2', category: null, subcategory: null, alias: null }); });
    expect(result.current.category).toBe('');
    expect(result.current.subcategory).toBe('');
    expect(result.current.nickname).toBe('');
  });

  it('close() sets transaction to null', () => {
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open(tx); });
    act(() => { result.current.close(); });
    expect(result.current.transaction).toBeNull();
  });

  it('setCategory() resets subcategory', () => {
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open(tx); });
    act(() => { result.current.setCategory('Transporte'); });
    expect(result.current.category).toBe('Transporte');
    expect(result.current.subcategory).toBe('');
  });

  it('save() calls PUT /transactions/:id with correct body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...tx, alias: 'novo' }),
    });
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open(tx); });
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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => updated,
    });
    const onSave = jest.fn();
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open(tx); });
    await act(async () => { await result.current.save(onSave); });
    expect(onSave).toHaveBeenCalledWith(updated);
    expect(result.current.transaction).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('save() API error keeps modal open and sets error status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 422 });
    const onSave = jest.fn();
    const { result } = renderHook(() => useEditTransaction());
    act(() => { result.current.open(tx); });
    await act(async () => { await result.current.save(onSave); });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.transaction).toEqual(tx);
    expect(result.current.status).toBe('error');
  });
});
