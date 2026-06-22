import { bankColor, bankLabel } from './banks';

describe('bankLabel', () => {
  it('returns em dash for null', () => {
    expect(bankLabel(null)).toBe('—');
  });

  it('returns display name for known internal key', () => {
    expect(bankLabel('itau')).toBe('Itaú');
  });

  it('returns the value as-is for unknown bank names stored by LLM', () => {
    expect(bankLabel('Santander')).toBe('Santander');
  });
});

describe('bankColor', () => {
  it('returns default gray for null', () => {
    expect(bankColor(null)).toBe('#94a3b8');
  });

  it('returns brand color for itau', () => {
    expect(bankColor('itau')).toBe('#FF6B00');
  });

  it('returns brand color for nubank', () => {
    expect(bankColor('nubank')).toBe('#820AD1');
  });

  it('is deterministic — same bank always gets the same color', () => {
    expect(bankColor('Santander')).toBe(bankColor('Santander'));
  });

  it('returns different colors for distinct bank names', () => {
    expect(bankColor('Santander')).not.toBe(bankColor('C6 Bank'));
  });
});
