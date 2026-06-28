export function LandingFooter() {
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
