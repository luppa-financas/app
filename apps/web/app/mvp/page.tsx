import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Dashboard from './dashboard';

export default async function MvpPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return <Dashboard />;
}
