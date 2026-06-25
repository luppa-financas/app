import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchHistory(token: string) {
  const res = await fetch(`${API}/invoices/history?months=6`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json() as Promise<{ month: string; byBank: Record<string, number> }[]>;
}

async function fetchSummary(token: string, month: string) {
  const res = await fetch(`${API}/invoices/summary?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { total: 0, byCategory: [] };
  return res.json() as Promise<{ total: number; byCategory: { category: string | null; subcategory: string | null; amount: number }[] }>;
}

async function fetchInvoices(token: string, month: string) {
  const res = await fetch(`${API}/invoices?month=${month}&status=DONE`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json() as Promise<{ id: string; bank: string | null; billingMonth: string | null; total: number; transactionCount: number }[]>;
}

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');

  const [history, params] = await Promise.all([
    fetchHistory(token),
    searchParams,
  ]);

  const months = history.map((h) => h.month).sort().reverse();
  const selectedMonth = params.month ?? months[0] ?? new Date().toISOString().slice(0, 7);

  const [summary, invoices] = await Promise.all([
    fetchSummary(token, selectedMonth),
    fetchInvoices(token, selectedMonth),
  ]);

  const banks = Array.from(
    new Set(history.flatMap((h) => Object.keys(h.byBank))),
  ).sort();

  return (
    <DashboardClient
      history={history}
      byCategory={summary.byCategory}
      invoices={invoices}
      grandTotal={summary.total}
      selectedMonth={selectedMonth}
      months={months}
      banks={banks}
    />
  );
}
