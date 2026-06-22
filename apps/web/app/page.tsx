import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const user = await currentUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Luppa</h1>
      <p className="max-w-md text-center text-lg text-gray-600">
        Envie suas faturas de cartão de crédito e veja para onde vai seu
        dinheiro — categorizado automaticamente, sem entrada manual.
      </p>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-lg border border-gray-300 px-6 py-2 font-medium hover:bg-gray-50"
        >
          Entrar
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-black px-6 py-2 font-medium text-white hover:bg-gray-800"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
