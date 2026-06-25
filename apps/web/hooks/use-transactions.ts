'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

export const LIMIT = 15;
const DEBOUNCE_MS = 300;

export interface TransactionsState {
  transactions: unknown[];
  total: number;
  page: number;
  sort: 'date' | 'amount';
  order: 'asc' | 'desc';
  q: string;
  month: string;
  bank: string;
  category: string;
  subcategory: string;
  loading: boolean;
  setPage: (page: number) => void;
  setQ: (q: string) => void;
  setMonth: (month: string) => void;
  setBank: (bank: string) => void;
  setCategory: (category: string) => void;
  setSubcategory: (subcategory: string) => void;
  toggleSort: (field: 'date' | 'amount') => void;
}

export function useTransactions(): TransactionsState {
  const { getToken } = useAuth();

  const [page, setPageState] = useState(1);
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [q, setQState] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [month, setMonthState] = useState('');
  const [bank, setBankState] = useState('');
  const [category, setCategoryState] = useState('');
  const [subcategory, setSubcategoryState] = useState('');
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    async function fetch_() {
      setLoading(true);
      try {
        const token = await getTokenRef.current();
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/transactions`);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', String(LIMIT));
        url.searchParams.set('sort', sort);
        url.searchParams.set('order', order);
        if (debouncedQ) url.searchParams.set('q', debouncedQ);
        if (month) url.searchParams.set('month', month);
        if (bank) url.searchParams.set('bank', bank);
        if (category) url.searchParams.set('category', category);
        if (subcategory) url.searchParams.set('subcategory', subcategory);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json() as { data: unknown[]; total: number };
        if (!cancelled) {
          setTransactions(json.data);
          setTotal(json.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetch_();
    return () => { cancelled = true; };
  }, [page, sort, order, debouncedQ, month, bank, category, subcategory]);

  const setPage = useCallback((p: number) => setPageState(p), []);

  const setQ = useCallback((v: string) => {
    setQState(v);
    setPageState(1);
  }, []);

  const setMonth = useCallback((v: string) => {
    setMonthState(v);
    setPageState(1);
  }, []);

  const setBank = useCallback((v: string) => {
    setBankState(v);
    setPageState(1);
  }, []);

  const setCategory = useCallback((v: string) => {
    setCategoryState(v);
    setSubcategoryState('');
    setPageState(1);
  }, []);

  const setSubcategory = useCallback((v: string) => setSubcategoryState(v), []);

  const toggleSort = useCallback((field: 'date' | 'amount') => {
    setSort((prev) => {
      if (prev === field) {
        setOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
        return prev;
      }
      setOrder('desc');
      return field;
    });
    setPageState(1);
  }, []);

  return {
    transactions,
    total,
    page,
    sort,
    order,
    q,
    month,
    bank,
    category,
    subcategory,
    loading,
    setPage,
    setQ,
    setMonth,
    setBank,
    setCategory,
    setSubcategory,
    toggleSort,
  };
}
