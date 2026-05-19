import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Dashboard from './dashboard';

const API = process.env.NEXT_PUBLIC_API_URL;

export default async function MvpPage() {
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) redirect('/waitlist');

  const user: { id: string; roles: string[] } = await res.json();
  if (!user.roles.includes('mvp')) redirect('/waitlist');

  return <Dashboard />;
}
