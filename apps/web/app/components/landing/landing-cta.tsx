import Link from 'next/link';
import { RevealOnScroll } from './reveal-on-scroll';

export function LandingCta() {
  return (
    <section className="relative bg-slate-900 py-32 overflow-hidden">
      <div
        className="landing-glow absolute rounded-full pointer-events-none"
        style={{ width: 700, height: 700, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <RevealOnScroll className="relative z-10 max-w-2xl mx-auto px-5 text-center">
        <p className="text-[11px] font-semibold text-indigo-400 tracking-[0.18em] uppercase mb-5">
          Gratuito para começar
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 tracking-tight leading-tight">
          Quanto você gastou esse mês<br />
          sem perceber?
        </h2>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Suba a primeira fatura e descubra em menos de um minuto.<br />
          Sem cartão de crédito, sem cadastro complicado.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-8 py-4 text-base transition-colors"
          >
            Começar grátis agora
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex justify-center items-center text-slate-400 hover:text-white font-medium px-6 py-4 transition-colors text-sm"
          >
            Já tenho conta →
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  );
}
