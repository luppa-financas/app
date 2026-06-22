'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [{ label: 'Faturas', href: '/faturas' }];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-slate-200 px-5 lg:px-7 flex">
      {NAV_ITEMS.map(({ label, href }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`border-b-2 px-5 h-11 text-sm font-medium flex items-center transition-colors ${
              active
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
