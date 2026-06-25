'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface UseInvoiceDetailReturn {
  isOpen: boolean;
  invoice: unknown | null;
  error: string | null;
  open: (invoiceId: string) => void;
  close: () => void;
}

export function useInvoiceDetail(): UseInvoiceDetailReturn {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [isOpen, setIsOpen] = useState(false);
  const [invoice, setInvoice] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (invoiceId: string) => {
    setError(null);
    try {
      const token = await getTokenRef.current();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`Failed to load invoice: ${res.status}`);
        return;
      }
      const data = await res.json() as unknown;
      setInvoice(data);
      setIsOpen(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setInvoice(null);
  }, []);

  return { isOpen, invoice, error, open, close };
}
