'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface EditableTransaction {
  id: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  alias: string | null;
}

type Status = 'idle' | 'saving' | 'error';

export interface UseEditTransactionReturn {
  transaction: EditableTransaction | null;
  category: string;
  subcategory: string;
  nickname: string;
  status: Status;
  matchCount: number | null;
  applyToAll: boolean;
  bulkConfirmOpen: boolean;
  open: (transaction: EditableTransaction) => void;
  close: () => void;
  setCategory: (category: string) => void;
  setSubcategory: (subcategory: string) => void;
  setNickname: (nickname: string) => void;
  setApplyToAll: (value: boolean) => void;
  save: (onSave: (updated: EditableTransaction) => void) => Promise<void>;
  requestBulk: () => void;
  confirmBulk: (onBulkSave: () => void) => Promise<void>;
  cancelBulk: () => void;
}

export function useEditTransaction(): UseEditTransactionReturn {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [transaction, setTransaction] = useState<EditableTransaction | null>(null);
  const [category, setCategoryState] = useState('');
  const [subcategory, setSubcategoryState] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [applyToAll, setApplyToAll] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const matchCountAbortRef = useRef<AbortController | null>(null);

  const open = useCallback((tx: EditableTransaction) => {
    setTransaction(tx);
    setCategoryState(tx.category ?? '');
    setSubcategoryState(tx.subcategory ?? '');
    setNickname(tx.alias ?? '');
    setStatus('idle');
    setMatchCount(null);
    setApplyToAll(false);
    setBulkConfirmOpen(false);

    matchCountAbortRef.current?.abort();
    const controller = new AbortController();
    matchCountAbortRef.current = controller;

    void (async () => {
      try {
        const token = await getTokenRef.current();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions/count?description=${encodeURIComponent(tx.description)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        if (res.ok) {
          const { count } = (await res.json()) as { count: number };
          if (typeof count === 'number') setMatchCount(count);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setMatchCount(null);
      }
    })();
  }, []);

  const close = useCallback(() => {
    matchCountAbortRef.current?.abort();
    setTransaction(null);
    setStatus('idle');
    setMatchCount(null);
    setApplyToAll(false);
    setBulkConfirmOpen(false);
  }, []);

  const setCategory = useCallback((cat: string) => {
    setCategoryState(cat);
    setSubcategoryState('');
  }, []);

  const save = useCallback(
    async (onSave: (updated: EditableTransaction) => void) => {
      if (!transaction) return;
      setStatus('saving');
      try {
        const token = await getTokenRef.current();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions/${transaction.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ category, subcategory, nickname }),
          },
        );
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const updated = (await res.json()) as EditableTransaction;
        setStatus('idle');
        setTransaction(null);
        onSave(updated);
      } catch {
        setStatus('error');
      }
    },
    [transaction, category, subcategory, nickname],
  );

  const requestBulk = useCallback(() => setBulkConfirmOpen(true), []);
  const cancelBulk = useCallback(() => setBulkConfirmOpen(false), []);

  const confirmBulk = useCallback(
    async (onBulkSave: () => void) => {
      if (!transaction) return;
      setStatus('saving');
      try {
        const token = await getTokenRef.current();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/transactions/bulk-categorize`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              description: transaction.description,
              category,
              subcategory: subcategory || null,
            }),
          },
        );
        if (!res.ok) {
          setStatus('error');
          return;
        }
        setStatus('idle');
        setTransaction(null);
        setBulkConfirmOpen(false);
        setMatchCount(null);
        setApplyToAll(false);
        onBulkSave();
      } catch {
        setStatus('error');
      }
    },
    [transaction, category, subcategory],
  );

  return {
    transaction,
    category,
    subcategory,
    nickname,
    status,
    matchCount,
    applyToAll,
    bulkConfirmOpen,
    open,
    close,
    setCategory,
    setSubcategory: setSubcategoryState,
    setNickname,
    setApplyToAll,
    save,
    requestBulk,
    confirmBulk,
    cancelBulk,
  };
}
