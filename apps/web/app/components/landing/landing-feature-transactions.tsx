import { FeatureList } from './feature-list';
import { RevealOnScroll } from './reveal-on-scroll';

const ROWS = [
  { date: '28/05', desc: 'UBER *TRIP', cat: 'Transporte', amount: 'R$ 42,00' },
  { date: '28/05', desc: 'RAPPI', cat: 'Alimentação', amount: 'R$ 89,50' },
  { date: '27/05', desc: 'NETFLIX', cat: 'Assinaturas', amount: 'R$ 55,90' },
  { date: '26/05', desc: 'SMART FIT', cat: 'Saúde', amount: 'R$ 99,90' },
  { date: '24/05', desc: 'CONDOMÍNIO', cat: 'Moradia', amount: 'R$ 1.200,00' },
  { date: '22/05', desc: 'SHOPEE', cat: 'Compras', amount: 'R$ 215,00' },
];

export function LandingFeatureTransactions() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll>
            <p className="text-[11px] font-semibold text-indigo-500 tracking-[0.18em] uppercase mb-3">Transações</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Cada centavo, no lugar certo.</h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">
              Todas as transações de todos os seus cartões em uma lista filtrável. Sem planilha, sem digitação, sem dor de cabeça.
            </p>
            <FeatureList
              items={[
                'Categorização automática por IA',
                'Filtros por banco, categoria e mês',
                'Busca global em todas as faturas',
                'Subcategorias automáticas por comerciante',
              ]}
            />
          </RevealOnScroll>

          <RevealOnScroll className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-xl">
            <div className="border-b border-slate-100 p-3 flex gap-2">
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 h-8 flex-1">
                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-xs text-slate-400">Buscar transação…</span>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 h-8 flex items-center border border-slate-200">
                <span className="text-xs text-slate-500">Mai 2026</span>
              </div>
            </div>
            <div
              className="grid items-center px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 text-[10px] font-semibold text-slate-400 uppercase tracking-widest"
              style={{ gridTemplateColumns: '56px 1fr 90px' }}
            >
              <span>Data</span>
              <span>Descrição</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="divide-y divide-slate-50">
              {ROWS.map((row, i) => (
                <div
                  key={i}
                  className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                  style={{ gridTemplateColumns: '56px 1fr 90px' }}
                >
                  <span className="mono text-xs text-slate-400">{row.date}</span>
                  <div>
                    <p className="text-sm text-slate-800 truncate">{row.desc}</p>
                    <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {row.cat}
                    </span>
                  </div>
                  <span className="mono text-sm text-slate-700 text-right">{row.amount}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs text-slate-400">91 transações · Total: R$ 13.232,12</span>
              <div className="flex gap-1 text-xs text-slate-500">
                <span>←</span>
                <span className="text-slate-400 px-1">1 / 7</span>
                <span>→</span>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
