import { useState, useCallback } from 'react';

export interface UseBankFilterReturn {
  selectedBanks: string[];
  toggle: (bank: string) => void;
  isActive: (bank: string) => boolean;
}

export function useBankFilter(banks: string[]): UseBankFilterReturn {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(banks));

  const toggle = useCallback((bank: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bank)) next.delete(bank);
      else next.add(bank);
      return next;
    });
  }, []);

  const isActive = useCallback((bank: string) => selected.has(bank), [selected]);

  return {
    selectedBanks: banks.filter((b) => selected.has(b)),
    toggle,
    isActive,
  };
}
