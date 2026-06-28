import Link from 'next/link';

const BANK_CARDS = [
  { name: 'Itaú', color: '#FF6B00', borderClass: 'border-l-[#FF6B00]', txs: 42, total: 'R$ 8.102,44' },
  { name: 'Nubank', color: '#820AD1', borderClass: 'border-l-[#820AD1]', txs: 18, total: 'R$ 1.138,35' },
  { name: 'Bradesco', color: '#CC0000', borderClass: 'border-l-[#CC0000]', txs: 31, total: 'R$ 3.992,33' },
];

const CATEGORIES = [
  { name: 'Alimentação', amount: 'R$ 3.200', width: '80%', color: 'bg-indigo-400' },
  { name: 'Moradia', amount: 'R$ 2.800', width: '70%', color: 'bg-violet-400' },
  { name: 'Compras', amount: 'R$ 1.800', width: '45%', color: 'bg-pink-400' },
];

export function LandingHero() {
  return (
    <section className="relative bg-slate-900 min-h-screen flex items-center overflow-hidden pt-16">
      <div className="landing-glow absolute rounded-full pointer-events-none" style={{ width: 700, height: 700, top: -200, left: -150 }} />
      <div className="landing-glow absolute rounded-full pointer-events-none" style={{ width: 500, height: 500, bottom: -150, right: -50 }} />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-16 sm:py-24 w-full">
        <div className="lg:grid lg:grid-cols-[1fr_480px] lg:gap-14 items-center">

          <div className="mb-14 lg:mb-0">
            <p className="landing-fade-up text-[11px] font-semibold text-indigo-400 tracking-[0.18em] uppercase mb-5">
              Controle financeiro pessoal
            </p>
            <h1 className="landing-fade-up-2 text-[2.6rem] sm:text-5xl font-bold text-white leading-[1.12] tracking-tight mb-6">
              Entenda pra onde<br />
              foi o seu{' '}
              <span className="bg-gradient-to-br from-indigo-300 to-purple-400 bg-clip-text text-transparent">
                dinheiro.
              </span>
            </h1>
            <p className="landing-fade-up-3 text-slate-400 text-lg leading-relaxed mb-10 max-w-lg">
              Suba o PDF da sua fatura e a IA extrai cada transação automaticamente.
              Um painel que consolida todos os seus cartões em um lugar só.
            </p>
            <div className="landing-fade-up-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/sign-up"
                className="inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6 py-3.5 transition-colors text-sm"
              >
                Começar grátis
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex justify-center items-center gap-2 text-slate-400 hover:text-slate-200 font-medium px-4 py-3.5 transition-colors text-sm"
              >
                Como funciona
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>

          <div className="landing-hero-preview mx-auto max-w-[480px]">
            <div
              className="rounded-2xl overflow-hidden border border-slate-700"
              style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}
            >
              <div className="h-9 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3">
                <div className="flex gap-1.5 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <div className="flex-1 bg-slate-700/60 rounded-md h-[22px] flex items-center px-3">
                  <span className="text-[10px] text-slate-500 tracking-tight">luppin.app/dashboard</span>
                </div>
              </div>

              <div className="bg-white border-b border-slate-200 h-11 flex items-center px-4 gap-5">
                <span className="text-sm font-semibold text-indigo-600 tracking-tight flex-shrink-0">luppa</span>
                <div className="flex gap-5">
                  <span className="text-[11px] font-medium text-indigo-600 border-b-2 border-indigo-500 pb-2 leading-none mt-2">Dashboard</span>
                  <span className="text-[11px] text-slate-400 pb-2 leading-none mt-2">Transações</span>
                  <span className="text-[11px] text-slate-400 pb-2 leading-none mt-2">Faturas</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4">
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Maio 2026</p>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="mono text-[1.6rem] font-medium text-slate-900">R$ 13.232,12</span>
                    <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      ↑ 7,6% vs. abril
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {BANK_CARDS.map((bank) => (
                    <div
                      key={bank.name}
                      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${bank.borderClass} px-3 py-2.5 flex items-center justify-between`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: bank.color }} />
                          <span className="text-[10px] text-slate-400">{bank.name} · {bank.txs} transações</span>
                        </div>
                        <p className="mono text-sm font-medium text-slate-800">{bank.total}</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Por categoria — maio</p>
                  <div className="space-y-2.5">
                    {CATEGORIES.map((cat) => (
                      <div key={cat.name}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] text-slate-600">{cat.name}</span>
                          <span className="mono text-[10px] text-slate-400">{cat.amount}</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full">
                          <div className={`h-full ${cat.color} rounded-full`} style={{ width: cat.width }} />
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          Assinaturas
                          <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">+50%</span>
                        </span>
                        <span className="mono text-[10px] text-amber-600 font-medium">R$ 750</span>
                      </div>
                      <div className="h-1 bg-amber-100 rounded-full">
                        <div className="h-full bg-amber-400 rounded-full w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
