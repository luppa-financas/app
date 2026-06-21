'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { detectEncryptedPdf } from '../../../lib/pdf-crypto';
import { useInvoicePolling } from '../../../hooks/use-invoice-polling';
import { formatBRL, formatMonth } from '../../../lib/format';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'processing'; invoiceId: string }
  | { kind: 'confirm'; invoiceId: string; bank: string | null; billingMonth: string | null; total: number | null }
  | { kind: 'success'; bank: string | null; billingMonth: string | null }
  | { kind: 'error-format' }
  | { kind: 'error-extraction' }
  | { kind: 'error-password'; file: File }
  | { kind: 'error-duplicate'; file: File };

export function InvoiceUploadZone() {
  const { getToken } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const [password, setPassword] = useState('');

  const pollingId = state.kind === 'processing' ? state.invoiceId : null;
  const { status: pollingStatus, invoice: polledInvoice } = useInvoicePolling(pollingId);

  // React to polling completion — avoids side effects during render (PollingBridge anti-pattern)
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
      const token = await getToken();
      const form = new FormData();
      form.append('file', file);
      if (pwd) form.append('password', pwd);

      const res = await fetch(`${API}/invoices`, {
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
  }, [getToken]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pdf') && file.type !== 'application/pdf') {
      setState({ kind: 'error-format' });
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (detectEncryptedPdf(bytes)) {
      setState({ kind: 'error-password', file });
      return;
    }
    await uploadFile(file);
  }, [uploadFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
      {/* idle / uploading */}
      {(state.kind === 'idle' || state.kind === 'uploading') && (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50/50'
              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
          } ${state.kind === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          aria-label="Selecionar fatura PDF"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">Arraste sua fatura aqui</p>
          <p className="text-xs text-slate-400">ou clique para selecionar · PDF até 20 MB</p>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={onInputChange} />
        </div>
      )}

      {/* processing */}
      {state.kind === 'processing' && (
        <div className="flex flex-col items-center py-8">
          <div className="w-12 h-12 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-5" />
          <p className="text-sm font-medium text-slate-700 mb-1">Lendo sua fatura…</p>
          <p className="text-xs text-slate-400">Isso pode levar alguns segundos</p>
        </div>
      )}

      {/* confirm */}
      {state.kind === 'confirm' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Fatura identificada</p>
              <p className="text-xs text-slate-400">Confirme os dados antes de processar</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Banco</p>
              <p className="text-sm font-medium text-slate-800">{state.bank ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Mês</p>
              <p className="text-sm font-medium text-slate-800">{formatMonth(state.billingMonth)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Total detectado</p>
              <p className="font-mono text-sm font-medium text-slate-800">{formatBRL(state.total)}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Os dados estão incorretos?{' '}
            <button onClick={reset} className="text-indigo-500 hover:text-indigo-700 underline">
              Enviar outra fatura
            </button>
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmAndFinish}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
            >
              Confirmar e processar
            </button>
            <button onClick={reset} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* success */}
      {state.kind === 'success' && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Fatura processada</p>
          <p className="text-xs text-slate-400 mb-5">
            {state.bank ?? 'Fatura'} · {formatMonth(state.billingMonth)} adicionada com sucesso
          </p>
          <button onClick={reset} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            + Adicionar outra fatura
          </button>
        </div>
      )}

      {/* error: wrong format */}
      {state.kind === 'error-format' && (
        <div>
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Formato inválido</p>
              <p className="text-xs text-red-600 mt-0.5">Só aceitamos arquivos PDF. Verifique o arquivo e tente novamente.</p>
            </div>
          </div>
          <button onClick={reset} className="w-full border border-slate-200 hover:bg-slate-50 text-sm text-slate-700 rounded-xl px-4 py-2.5 transition-colors">
            Tentar novamente
          </button>
        </div>
      )}

      {/* error: extraction failed */}
      {state.kind === 'error-extraction' && (
        <div>
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Não conseguimos ler essa fatura</p>
              <p className="text-xs text-red-600 mt-0.5">O arquivo pode estar corrompido ou em um formato não suportado. Tente exportar novamente pelo app do banco.</p>
            </div>
          </div>
          <button onClick={reset} className="w-full border border-slate-200 hover:bg-slate-50 text-sm text-slate-700 rounded-xl px-4 py-2.5 transition-colors">
            Tentar outro arquivo
          </button>
        </div>
      )}

      {/* error: password protected */}
      {state.kind === 'error-password' && (
        <div>
          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Esta fatura está protegida por senha</p>
              <p className="text-xs text-amber-700 mt-0.5">Geralmente é o CPF sem pontos ou os primeiros dígitos da conta.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder="Senha da fatura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && state.kind === 'error-password') {
                  void uploadFile(state.file, password);
                }
              }}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
            <button
              disabled={!password}
              onClick={() => state.kind === 'error-password' && void uploadFile(state.file, password)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors"
            >
              Desbloquear
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">A senha não é armazenada e é usada somente neste momento.</p>
        </div>
      )}

      {/* error: duplicate */}
      {state.kind === 'error-duplicate' && (
        <div>
          <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Fatura já importada</p>
              <p className="text-xs text-amber-700 mt-0.5">Encontramos uma fatura com o mesmo período já cadastrada. Deseja substituir?</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => state.kind === 'error-duplicate' && void uploadFile(state.file)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
            >
              Substituir fatura existente
            </button>
            <button onClick={reset} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
