import { SignOutButton } from './sign-out-button';

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Você está na lista de espera</h1>
        <p className="text-gray-600">
          O Luppa está em acesso antecipado. Assim que sua conta for ativada, você receberá acesso automático.
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}
