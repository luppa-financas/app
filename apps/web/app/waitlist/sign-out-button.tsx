'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      onClick={() => signOut(() => router.push('/sign-in'))}
      className="mt-6 text-sm text-gray-500 hover:text-gray-700 underline"
    >
      Sair da conta
    </button>
  );
}
