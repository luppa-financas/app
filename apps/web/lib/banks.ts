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

// Curated hues (HSL) — spaced to avoid dull yellows and very light greens
const PALETTE_HUES = [210, 160, 350, 270, 30, 190, 320, 140, 20, 240, 0, 290];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function bankLabel(bank: string | null): string {
  if (!bank) return '—';
  return BANK_DISPLAY[bank] ?? bank;
}

export function bankColor(bank: string | null): string {
  if (!bank) return '#94a3b8';
  if (BANK_COLOR[bank]) return BANK_COLOR[bank];
  const hue = PALETTE_HUES[hashStr(bank) % PALETTE_HUES.length];
  return `hsl(${hue}, 60%, 45%)`;
}
