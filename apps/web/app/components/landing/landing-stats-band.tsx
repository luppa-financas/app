import { RevealOnScroll } from './reveal-on-scroll';

const STATS = [
  { value: '91', label: 'transações extraídas por mês' },
  { value: '3', label: 'bancos consolidados em um painel' },
  { value: '0 min', label: 'de digitação manual' },
];

export function LandingStatsBand() {
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
