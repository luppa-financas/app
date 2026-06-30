import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AnalyticsChart } from './components/landing/analytics-chart';
import { LandingNavbar } from './components/landing/landing-navbar';
import { RevealOnScroll } from './components/landing/reveal-on-scroll';

const CARD_CLASS =
  'bg-white rounded-2xl border border-slate-200 shadow-md transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-xl';

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((text) => (
        <li key={text} className="flex items-center gap-3 text-slate-600 text-sm">
          <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </span>
          {text}
        </li>
      ))}
    </ul>
  );
}

interface FeatureSectionProps {
  background: 'white' | 'slate';
  imageOnLeft?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  visual: ReactNode;
  visualClassName?: string;
}

function FeatureSection({
  background,
  imageOnLeft = false,
  eyebrow,
  title,
  description,
  items,
  visual,
  visualClassName = '',
}: FeatureSectionProps) {
  const bgClass = background === 'white' ? 'bg-white' : 'bg-slate-50';
  const textOrder = imageOnLeft ? 'order-1 lg:order-2' : '';
  const visualOrder = imageOnLeft ? 'order-2 lg:order-1' : '';

  return (
    <section className={`py-24 ${bgClass}`}>
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll className={textOrder}>
            <p className="text-[11px] font-semibold text-indigo-500 tracking-[0.18em] uppercase mb-3">
              {eyebrow}
            </p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{title}</h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">{description}</p>
            <FeatureList items={items} />
          </RevealOnScroll>

          <RevealOnScroll className={`${visualOrder} ${visualClassName}`.trim()}>
            {visual}
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

const HERO_BANK_CARDS = [
  { name: 'Itaú', color: '#FF6B00', borderClass: 'border-l-[#FF6B00]', txs: 42, total: 'R$ 8.102,44' },
  { name: 'Nubank', color: '#820AD1', borderClass: 'border-l-[#820AD1]', txs: 18, total: 'R$ 1.138,35' },
  { name: 'Bradesco', color: '#CC0000', borderClass: 'border-l-[#CC0000]', txs: 31, total: 'R$ 3.992,33' },
];

const HERO_CATEGORIES = [
  { name: 'Alimentação', amount: 'R$ 3.200', width: '80%', color: 'bg-indigo-400' },
  { name: 'Moradia', amount: 'R$ 2.800', width: '70%', color: 'bg-violet-400' },
  { name: 'Compras', amount: 'R$ 1.800', width: '45%', color: 'bg-pink-400' },
];

function Hero() {
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
                  {HERO_BANK_CARDS.map((bank) => (
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
                    {HERO_CATEGORIES.map((cat) => (
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

const STATS = [
  { value: '91', label: 'transações extraídas por mês' },
  { value: '3', label: 'bancos consolidados em um painel' },
  { value: '0 min', label: 'de digitação manual' },
];

function StatsBand() {
  return (
    <section className="border-y border-slate-100 py-10 bg-white">
      <RevealOnScroll className="max-w-4xl mx-auto px-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center py-6 sm:py-0">
            <p className="mono text-3xl font-medium text-slate-900 mb-1">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </RevealOnScroll>
    </section>
  );
}

const PROCESSING_LOG = [
  { label: 'Lendo fatura…', highlight: false },
  { label: 'Banco identificado: Itaú', highlight: false },
  { label: '42 transações extraídas', highlight: false },
  { label: 'Categorias definidas — pronto', highlight: true },
];

const HOW_BARS = [
  { height: '55%', color: '#A5B4FC' },
  { height: '72%', color: '#818CF8' },
  { height: '48%', color: '#A5B4FC' },
  { height: '80%', color: '#818CF8' },
  { height: '65%', color: '#A5B4FC' },
  { height: '92%', color: '#4F46E5' },
];

function HowItWorks() {
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
                {HOW_BARS.map((bar, i) => (
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

const TRANSACTIONS_ROWS = [
  { date: '28/05', desc: 'UBER *TRIP', cat: 'Transporte', amount: 'R$ 42,00' },
  { date: '28/05', desc: 'RAPPI', cat: 'Alimentação', amount: 'R$ 89,50' },
  { date: '27/05', desc: 'NETFLIX', cat: 'Assinaturas', amount: 'R$ 55,90' },
  { date: '26/05', desc: 'SMART FIT', cat: 'Saúde', amount: 'R$ 99,90' },
  { date: '24/05', desc: 'CONDOMÍNIO', cat: 'Moradia', amount: 'R$ 1.200,00' },
  { date: '22/05', desc: 'SHOPEE', cat: 'Compras', amount: 'R$ 215,00' },
];

function TransactionsVisual() {
  return (
    <>
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
        {TRANSACTIONS_ROWS.map((row, i) => (
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
    </>
  );
}

interface Goal {
  name: string;
  current: string;
  limit: string;
  width: string;
  status: 'ok' | 'attention' | 'exceeded';
  message: string;
  badge?: string;
}

const GOALS: Goal[] = [
  { name: 'Alimentação', current: 'R$ 3.200', limit: '4.000', width: '80%', status: 'ok', message: '80% utilizado — dentro da meta' },
  { name: 'Moradia', current: 'R$ 2.800', limit: '3.000', width: '93%', status: 'attention', message: '93% utilizado — atenção' },
  { name: 'Transporte', current: 'R$ 1.100', limit: '1.500', width: '73%', status: 'ok', message: '73% utilizado — dentro da meta' },
  { name: 'Assinaturas', current: 'R$ 750', limit: '500', width: '100%', status: 'exceeded', message: 'Meta excedida em R$ 250', badge: '+50%' },
];

function goalTrackColor(status: Goal['status']) {
  return status === 'exceeded' ? 'bg-amber-100' : 'bg-slate-100';
}
function goalFillColor(status: Goal['status']) {
  return status === 'exceeded' ? 'bg-amber-500' : 'bg-emerald-400';
}
function goalMessageColor(status: Goal['status']) {
  if (status === 'exceeded') return 'text-amber-600';
  if (status === 'attention') return 'text-slate-500';
  return 'text-emerald-600';
}

function GoalsVisual() {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Metas — Maio 2026</p>
        <button type="button" className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
          Configurar →
        </button>
      </div>
      <div className="space-y-5">
        {GOALS.map((goal) => (
          <div key={goal.name}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-700 flex items-center gap-1.5">
                {goal.name}
                {goal.badge && (
                  <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    {goal.badge}
                  </span>
                )}
              </span>
              <span className={`mono text-xs ${goal.status === 'exceeded' ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                {goal.current} / {goal.limit}
              </span>
            </div>
            <div className={`h-1.5 ${goalTrackColor(goal.status)} rounded-full`}>
              <div className={`h-full ${goalFillColor(goal.status)} rounded-full`} style={{ width: goal.width }} />
            </div>
            <p className={`text-[10px] mt-1 ${goalMessageColor(goal.status)}`}>{goal.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}

type InvoiceStatus = 'done' | 'process' | 'review' | 'failed';

interface Invoice {
  bank: string;
  period: string;
  status: InvoiceStatus;
  total: string;
  borderClass: string;
}

const INVOICES: Invoice[] = [
  { bank: 'Itaú', period: 'Maio 2026 · 42 transações', status: 'done', total: 'R$ 8.102,44', borderClass: 'border-l-[#FF6B00]' },
  { bank: 'Nubank', period: 'Maio 2026 · 18 transações', status: 'done', total: 'R$ 1.138,35', borderClass: 'border-l-[#820AD1]' },
  { bank: 'Bradesco', period: 'Maio 2026 · 31 transações', status: 'review', total: 'R$ 3.992,33', borderClass: 'border-l-[#CC0000]' },
  { bank: 'Itaú', period: 'Abril 2026', status: 'process', total: '—', borderClass: 'border-l-[#FF6B00]' },
  { bank: 'Bradesco', period: 'Março 2026 · 28 transações', status: 'failed', total: '', borderClass: 'border-l-slate-300' },
];

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, { label: string; classes: string }> = {
  done: { label: 'Processada', classes: 'bg-emerald-100 text-emerald-700' },
  process: { label: 'Processando…', classes: 'bg-yellow-100 text-yellow-800' },
  review: { label: 'Revisar', classes: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Falhou', classes: 'bg-red-100 text-red-700' },
};

function InvoicesVisual() {
  return (
    <div className="space-y-2.5">
      {INVOICES.map((invoice, i) => {
        const style = INVOICE_STATUS_STYLES[invoice.status];
        return (
          <div
            key={i}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${invoice.borderClass} flex items-center justify-between px-4 py-3.5 shadow-sm transition-shadow duration-200 hover:shadow-md`}
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{invoice.bank}</p>
              <p className="text-xs text-slate-400">{invoice.period}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.classes}`}>
                {style.label}
              </span>
              {invoice.status === 'failed' ? (
                <button type="button" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                  Tentar novamente
                </button>
              ) : (
                <p className={`mono text-sm ${invoice.total === '—' ? 'text-slate-400' : 'text-slate-700'}`}>
                  {invoice.total}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cta() {
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

function Footer() {
  return (
    <footer className="bg-slate-950 py-8">
      <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-base font-semibold tracking-tight text-indigo-500">luppa</span>
        <p className="text-xs text-slate-700">© 2026 luppa · Controle seus gastos</p>
        <div className="flex gap-5">
          <a href="#" className="text-xs text-slate-700 hover:text-slate-400 transition-colors">
            Privacidade
          </a>
          <a href="#" className="text-xs text-slate-700 hover:text-slate-400 transition-colors">
            Termos
          </a>
          <a href="#" className="text-xs text-slate-700 hover:text-slate-400 transition-colors">
            Suporte
          </a>
        </div>
      </div>
    </footer>
  );
}

export default async function HomePage() {
  const user = await currentUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="bg-white text-slate-900">
      <LandingNavbar />
      <Hero />
      <StatsBand />
      <HowItWorks />
      <FeatureSection
        background="slate"
        eyebrow="Transações"
        title="Cada centavo, no lugar certo."
        description="Todas as transações de todos os seus cartões em uma lista filtrável. Sem planilha, sem digitação, sem dor de cabeça."
        items={[
          'Categorização automática por IA',
          'Filtros por banco, categoria e mês',
          'Busca global em todas as faturas',
          'Subcategorias automáticas por comerciante',
        ]}
        visual={<TransactionsVisual />}
        visualClassName={`${CARD_CLASS} overflow-hidden`}
      />
      <FeatureSection
        background="white"
        imageOnLeft
        eyebrow="Análise histórica"
        title="Veja a evolução mês a mês."
        description="Gráficos que mostram como os seus gastos evoluíram ao longo dos meses, por banco e por categoria. Você vê o padrão antes que ele vire problema."
        items={[
          'Histórico consolidado por banco',
          'Comparativo % em relação ao mês anterior',
          'Breakdown por subcategoria com drill-down',
        ]}
        visual={<AnalyticsChart />}
        visualClassName={`${CARD_CLASS} p-5`}
      />
      <FeatureSection
        background="slate"
        eyebrow="Metas e alertas"
        title="Saiba antes de gastar demais."
        description="Configure limites por categoria e acompanhe o progresso em tempo real. Quando uma meta é ultrapassada, você sabe imediatamente."
        items={[
          'Metas configuráveis por categoria',
          'Alertas visuais quando o limite é excedido',
          'Comparação percentual mês a mês',
        ]}
        visual={<GoalsVisual />}
        visualClassName={`${CARD_CLASS} p-5`}
      />
      <FeatureSection
        background="white"
        imageOnLeft
        eyebrow="Gestão de faturas"
        title="Todos os bancos. Um lugar só."
        description="Suba faturas de qualquer banco e acompanhe o histórico de importações. O luppa rastreia cada fatura e avisa quando algo precisa de atenção."
        items={[
          'Funciona com Itaú, Nubank, Bradesco e mais',
          'Status em tempo real do processamento',
          'Detecta senhas de PDF automaticamente',
          'Detecta duplicatas antes de processar',
        ]}
        visual={<InvoicesVisual />}
      />
      <Cta />
      <Footer />
    </main>
  );
}
