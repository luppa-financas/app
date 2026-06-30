import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Nav } from './nav';

export default function V1Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-5 lg:px-7 h-14 flex items-center justify-between sticky top-0 z-10">
        <span className="text-sm font-semibold text-slate-800">Luppa</span>
        <div className="flex items-center gap-3">
          <Link
            href="/mvp"
            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Versão anterior
          </Link>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: 'w-8 h-8',
              },
            }}
          />
        </div>
      </header>

      <Nav />

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
