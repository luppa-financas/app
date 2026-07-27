'use client';

import { CATEGORIES } from '../../../../lib/categories';
import type { EditableTransaction, UseEditTransactionReturn } from '../../../../hooks/use-edit-transaction';

interface EditTransactionModalProps {
  hook: UseEditTransactionReturn;
  onSave: (updated: EditableTransaction) => void;
}

export function EditTransactionModal({ hook, onSave }: EditTransactionModalProps) {
  const { transaction, category, subcategory, nickname, status, close, setCategory, setSubcategory, setNickname, save } = hook;

  if (!transaction) return null;

  const subcategories = (category && CATEGORIES[category]) ? CATEGORIES[category] : [];

  function handleSave() {
    void save(onSave);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />

      <div className="relative bg-white w-full sm:w-[440px] rounded-t-2xl sm:rounded-2xl shadow-xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Editar transação</h2>
          <button onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-slate-400 -mt-2 truncate">{transaction.alias ?? (transaction as { description?: string }).description}</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            >
              <option value="">Sem categoria</option>
              {Object.keys(CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Subcategoria</label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={subcategories.length === 0}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Sem subcategoria</option>
              {subcategories.map((sub: string) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Apelido</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Netflix, Academia, Feira…"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 h-9 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder-slate-300"
            />
          </div>
        </div>

        {status === 'error' && (
          <p className="text-xs text-red-500">Não foi possível salvar. Tente novamente.</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={close}
            className="flex-1 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="flex-1 h-9 rounded-lg bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
