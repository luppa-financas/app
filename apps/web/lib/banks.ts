export type BankKey = 'itau' | 'nubank' | 'bradesco' | 'other' | string;

export const BANK_DISPLAY: Record<string, string> = {
  itau: 'Itaú',
  nubank: 'Nubank',
  bradesco: 'Bradesco',
  other: 'Outro',
};

export const BANK_COLOR: Record<string, string> = {
  itau: '#FF6B00',
  nubank: '#820AD1',
  bradesco: '#CC0000',
};

export function bankLabel(bank: string | null): string {
  if (!bank) return '—';
  return BANK_DISPLAY[bank] ?? bank;
}

export function bankColor(bank: string | null): string {
  return bank ? (BANK_COLOR[bank] ?? '#94a3b8') : '#94a3b8';
}
