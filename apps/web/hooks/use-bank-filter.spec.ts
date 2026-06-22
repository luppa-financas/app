/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useBankFilter } from './use-bank-filter';

const banks = ['itau', 'nubank', 'bradesco'];

describe('useBankFilter', () => {
  it('starts with all banks selected', () => {
    const { result } = renderHook(() => useBankFilter(banks));
    expect(result.current.selectedBanks).toEqual(banks);
  });

  it('toggle deselects a selected bank', () => {
    const { result } = renderHook(() => useBankFilter(banks));
    act(() => { result.current.toggle('nubank'); });
    expect(result.current.selectedBanks).not.toContain('nubank');
  });

  it('toggle reselects a deselected bank', () => {
    const { result } = renderHook(() => useBankFilter(banks));
    act(() => { result.current.toggle('nubank'); });
    act(() => { result.current.toggle('nubank'); });
    expect(result.current.selectedBanks).toContain('nubank');
  });

  it('selectedBanks contains only checked banks', () => {
    const { result } = renderHook(() => useBankFilter(banks));
    act(() => { result.current.toggle('itau'); });
    act(() => { result.current.toggle('bradesco'); });
    expect(result.current.selectedBanks).toEqual(['nubank']);
  });

  it('isActive returns true for selected banks and false for deselected', () => {
    const { result } = renderHook(() => useBankFilter(banks));
    act(() => { result.current.toggle('itau'); });
    expect(result.current.isActive('itau')).toBe(false);
    expect(result.current.isActive('nubank')).toBe(true);
  });
});
