'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 h-16 transition-[background,border-color,box-shadow] duration-300 ease-out ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'
          : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
        <span
          className={`text-lg font-semibold tracking-tight transition-colors duration-300 ${
            scrolled ? 'text-indigo-600' : 'text-indigo-300'
          }`}
        >
          luppa
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={`hidden sm:block text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 ${
              scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/65 hover:text-white'
            }`}
          >
            Entrar
          </Link>
          <Link
            href="/sign-up"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}
