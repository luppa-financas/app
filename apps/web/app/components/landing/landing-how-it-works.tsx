import { RevealOnScroll } from './reveal-on-scroll';

const PROCESSING_LOG = [
  { label: 'Lendo fatura…', highlight: false },
  { label: 'Banco identificado: Itaú', highlight: false },
  { label: '42 transações extraídas', highlight: false },
  { label: 'Categorias definidas — pronto', highlight: true },
];

const BARS = [
  { height: '55%', color: '#A5B4FC' },
  { height: '72%', color: '#818CF8' },
  { height: '48%', color: '#A5B4FC' },
  { height: '80%', color: '#818CF8' },
  { height: '65%', color: '#A5B4FC' },
  { height: '92%', color: '#4F46E5' },
];

export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <RevealOnScroll className="text-center mb-16">
          <p className="text-[11px] font-semibold text-indigo-500 tracking-[0.18em] uppercase mb-3">Como funciona</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Três passos. Sem complicação.</h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto">
            Você não precisa de planilha, de configuração ou de nenhuma senha de banco.
          </p>
        </RevealOnScroll>

        <div className="grid md:grid-cols-3 gap-8">
          <RevealOnScroll delay={1} className="relative">
            <div className="hidden md:block absolute top-5 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-px bg-slate-200" />
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Suba o PDF da fatura</h3>
            <p className="text-slate-500 leading-relaxed text-sm mb-5">
              Exporte a fatura pelo app do banco e arraste aqui. Funciona com qualquer banco brasileiro — Itaú, Nubank, Bradesco e mais.
            </p>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/50">
              <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6" />
                </svg>
              </div>
              <p className="text-xs font-medium text-slate-600 mb-0.5">fatura_maio_itau.pdf</p>
              <p className="text-[10px] text-slate-400">Arraste ou clique para selecionar</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={2} className="relative">
            <div className="hidden md:block absolute top-5 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-px bg-slate-200" />
            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">A IA lê e extrai tudo</h3>
            <p className="text-slate-500 leading-relaxed text-sm mb-5">
              Claude lê o PDF e extrai cada transação com data, valor e comerciante. Sem parsers, sem regras manuais, sem erros de leitura.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              {PROCESSING_LOG.map((entry, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      entry.highlight ? 'bg-emerald-500 landing-pulse-dot' : 'bg-emerald-400'
                    }`}
                  />
                  <span className={`text-xs ${entry.highlight ? 'font-semibold text-emerald-600' : 'text-slate-600'}`}>
                    {entry.label}
                  </span>
                </div>
              ))}
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={3}>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Você visualiza tudo</h3>
            <p className="text-slate-500 leading-relaxed text-sm mb-5">
              Dashboard com gráficos, filtros por categoria e comparação mês a mês. Em segundos você entende onde está gastando.
            </p>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-end gap-1.5 h-12 mb-2">
                {BARS.map((bar, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: bar.height, background: bar.color }} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Dez</span>
                <span>Jan</span>
                <span>Fev</span>
                <span>Mar</span>
                <span>Abr</span>
                <span className="text-indigo-500 font-medium">Mai</span>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
