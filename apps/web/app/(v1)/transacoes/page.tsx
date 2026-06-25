import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TransactionsClient } from './transactions-client';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchBillingMonths(token: string): Promise<string[]> {
  const res = await fetch(`${API}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const invoices = (await res.json()) as { billingMonth: string | null }[];
  const seen = new Set<string>();
  for (const inv of invoices) {
    if (!inv.billingMonth) continue;
    const d = new Date(inv.billingMonth);
    seen.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return [...seen].sort().reverse();
}

export default async function TransacoesPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');

  const months = await fetchBillingMonths(token);

  return <TransactionsClient months={months} />;
}
