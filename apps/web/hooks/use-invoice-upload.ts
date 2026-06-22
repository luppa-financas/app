'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { detectEncryptedPdf } from '../lib/pdf-crypto';
import { useInvoicePolling } from './use-invoice-polling';

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'processing'; invoiceId: string }
  | { kind: 'confirm'; invoiceId: string; bank: string | null; billingMonth: string | null; total: number | null }
  | { kind: 'success'; bank: string | null; billingMonth: string | null }
  | { kind: 'error-format' }
  | { kind: 'error-extraction' }
  | { kind: 'error-password'; file: File }
  | { kind: 'error-duplicate'; file: File };

export interface UseInvoiceUploadReturn {
  state: UploadState;
  password: string;
  setPassword: (v: string) => void;
  handleFile: (file: File) => Promise<void>;
  onDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
  confirmAndFinish: () => void;
}

export function useInvoiceUpload(): UseInvoiceUploadReturn {
  const { getToken } = useAuth();
  const router = useRouter();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const [password, setPassword] = useState('');

  const pollingId = state.kind === 'processing' ? state.invoiceId : null;
  const { status: pollingStatus, invoice: polledInvoice } = useInvoicePolling(pollingId);

  useEffect(() => {
    if (!pollingId) return;
    if (pollingStatus === 'DONE' || pollingStatus === 'NEEDS_REVIEW') {
      const inv = polledInvoice as { bank?: string | null; billingMonth?: string | null; invoiceTotal?: number | null } | null;
      setState({
        kind: 'confirm',
        invoiceId: pollingId,
        bank: inv?.bank ?? null,
        billingMonth: inv?.billingMonth ? String(inv.billingMonth) : null,
        total: inv?.invoiceTotal ?? null,
      });
    } else if (pollingStatus === 'FAILED') {
      setState({ kind: 'error-extraction' });
    }
  }, [pollingId, pollingStatus, polledInvoice]);

  const uploadFile = useCallback(async (file: File, pwd?: string) => {
    setState({ kind: 'uploading' });
    try {
      const token = await getTokenRef.current();
      const form = new FormData();
      form.append('file', file);
      if (pwd) form.append('password', pwd);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (res.status === 409) {
        setState({ kind: 'error-duplicate', file });
        return;
      }
      if (!res.ok) {
        setState({ kind: 'error-extraction' });
        return;
      }

      const { invoiceId } = await res.json() as { invoiceId: string };
      setState({ kind: 'processing', invoiceId });
    } catch {
      setState({ kind: 'error-extraction' });
    }
  }, []);

  const handleFile = useCallback(async (file: File, pwd?: string) => {
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      setState({ kind: 'error-format' });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (detectEncryptedPdf(bytes)) {
      setState({ kind: 'error-password', file });
      return;
    }
    await uploadFile(file, pwd);
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const reset = useCallback(() => {
    setState({ kind: 'idle' });
    setPassword('');
  }, []);

  const confirmAndFinish = useCallback(() => {
    if (state.kind !== 'confirm') return;
    setState({ kind: 'success', bank: state.bank, billingMonth: state.billingMonth });
    router.refresh();
  }, [state, router]);

  return {
    state,
    password,
    setPassword,
    handleFile,
    onDrop,
    onInputChange,
    reset,
    confirmAndFinish,
  };
}
