export function formatBRL(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatMonth(billingMonth: string | Date | null): string {
  if (!billingMonth) return '—';
  const d = new Date(billingMonth);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
