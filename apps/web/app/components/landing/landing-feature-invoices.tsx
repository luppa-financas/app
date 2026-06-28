import { FeatureList } from './feature-list';
import { RevealOnScroll } from './reveal-on-scroll';

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

const STATUS_STYLES: Record<InvoiceStatus, { label: string; classes: string }> = {
  done: { label: 'Processada', classes: 'bg-emerald-100 text-emerald-700' },
  process: { label: 'Processando…', classes: 'bg-yellow-100 text-yellow-800' },
  review: { label: 'Revisar', classes: 'bg-amber-100 text-amber-800' },
  failed: { label: 'Falhou', classes: 'bg-red-100 text-red-700' },
};

export function LandingFeatureInvoices() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll className="order-2 lg:order-1">
            <div className="space-y-2.5">
              {INVOICES.map((invoice, i) => {
                const style = STATUS_STYLES[invoice.status];
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
          </RevealOnScroll>

          <RevealOnScroll className="order-1 lg:order-2">
            <p className="text-[11px] font-semibold text-indigo-500 tracking-[0.18em] uppercase mb-3">Gestão de faturas</p>
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Todos os bancos. Um lugar só.</h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-6">
              Suba faturas de qualquer banco e acompanhe o histórico de importações. O luppa rastreia cada fatura e avisa quando algo precisa de atenção.
            </p>
            <FeatureList
              items={[
                'Funciona com Itaú, Nubank, Bradesco e mais',
                'Status em tempo real do processamento',
                'Detecta senhas de PDF automaticamente',
                'Detecta duplicatas antes de processar',
              ]}
            />
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
