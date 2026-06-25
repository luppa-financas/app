import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { InvoiceList, InvoiceListItem } from './invoice-list';
import { InvoiceUploadZone } from './invoice-upload-zone';

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchInvoices(token: string): Promise<InvoiceListItem[]> {
  const res = await fetch(`${API}/invoices`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json() as Promise<InvoiceListItem[]>;
}

export default async function FaturasPage() {
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) redirect('/sign-in');

  const invoices = await fetchInvoices(token);

  return (
    <div className="max-w-3xl mx-auto p-5 lg:p-7">
      <InvoiceUploadZone />
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
        Faturas importadas
      </p>
      <InvoiceList invoices={invoices} />
    </div>
  );
}
