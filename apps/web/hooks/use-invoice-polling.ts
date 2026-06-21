'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

const BACKOFF_STEPS = [3000, 3000, 5000, 5000, 8000, 10000];

type InvoiceStatus = 'PENDING' | 'DONE' | 'FAILED' | 'NEEDS_REVIEW';

type Invoice = {
  id: string;
  status: InvoiceStatus;
  [key: string]: unknown;
};

const TERMINAL: Set<InvoiceStatus> = new Set(['DONE', 'FAILED', 'NEEDS_REVIEW']);

export function useInvoicePolling(invoiceId: string | null) {
  const { getToken } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(0);
  // Keep getToken stable — avoids restarting the poll on every Clerk token refresh
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; });

  const fetchInvoice = useCallback(async () => {
    const token = await getTokenRef.current();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: Invoice = await res.json();

    if (!mountedRef.current) return;

    // Skip no-op update when nothing changed
    setInvoice(prev => (prev?.status === data.status && prev?.id === data.id ? prev : data));

    if (TERMINAL.has(data.status)) {
      setIsPolling(false);
      return;
    }

    const delay = BACKOFF_STEPS[Math.min(stepRef.current, BACKOFF_STEPS.length - 1)];
    stepRef.current += 1;
    timerRef.current = setTimeout(() => void fetchInvoice(), delay);
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId) return;

    mountedRef.current = true;
    stepRef.current = 0;
    timerRef.current = null;
    setIsPolling(true);

    void fetchInvoice();

    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsPolling(false);
    };
  }, [invoiceId, fetchInvoice]);

  return {
    invoice,
    status: invoice?.status ?? null,
    isPolling,
  };
}
