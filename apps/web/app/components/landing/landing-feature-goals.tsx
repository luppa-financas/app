import { FeatureList } from './feature-list';
import { RevealOnScroll } from './reveal-on-scroll';

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

function trackColor(status: Goal['status']) {
  return status === 'exceeded' ? 'bg-amber-100' : 'bg-slate-100';
}
function fillColor(status: Goal['status']) {
  if (status === 'exceeded') return 'bg-amber-500';
  return 'bg-emerald-400';
}
function messageColor(status: Goal['status']) {
  if (status === 'exceeded') return 'text-amber-600';
  if (status === 'attention') return 'text-slate-500';
  return 'text-emerald-600';
}

export function LandingFeatureGoals() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll>
            <p className="text-[11px] font-semibold text-indigo-500 tracking-[0.18em] uppercase mb-3">Metas e alertas</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Saiba antes de gastar demais.</h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">
              Configure limites por categoria e acompanhe o progresso em tempo real. Quando uma meta é ultrapassada, você sabe imediatamente.
            </p>
            <FeatureList
              items={[
                'Metas configuráveis por categoria',
                'Alertas visuais quando o limite é excedido',
                'Comparação percentual mês a mês',
              ]}
            />
          </RevealOnScroll>

          <RevealOnScroll className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-xl">
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
                    <span
                      className={`mono text-xs ${
                        goal.status === 'exceeded' ? 'text-amber-600 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {goal.current} / {goal.limit}
                    </span>
                  </div>
                  <div className={`h-1.5 ${trackColor(goal.status)} rounded-full`}>
                    <div className={`h-full ${fillColor(goal.status)} rounded-full`} style={{ width: goal.width }} />
                  </div>
                  <p className={`text-[10px] mt-1 ${messageColor(goal.status)}`}>{goal.message}</p>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
