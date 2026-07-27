'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface EditableTransaction {
  id: string;
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
  open: (transaction: EditableTransaction) => void;
  close: () => void;
  setCategory: (category: string) => void;
  setSubcategory: (subcategory: string) => void;
  setNickname: (nickname: string) => void;
  save: (onSave: (updated: EditableTransaction) => void) => Promise<void>;
}

export function useEditTransaction(): UseEditTransactionReturn {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [transaction, setTransaction] = useState<EditableTransaction | null>(null);
  const [category, setCategoryState] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const open = useCallback((tx: EditableTransaction) => {
    setTransaction(tx);
    setCategoryState(tx.category ?? '');
    setSubcategory(tx.subcategory ?? '');
    setNickname(tx.alias ?? '');
    setStatus('idle');
  }, []);

  const close = useCallback(() => {
    setTransaction(null);
    setStatus('idle');
  }, []);

  const setCategory = useCallback((cat: string) => {
    setCategoryState(cat);
    setSubcategory('');
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

  return {
    transaction,
    category,
    subcategory,
    nickname,
    status,
    open,
    close,
    setCategory,
    setSubcategory,
    setNickname,
    save,
  };
}
