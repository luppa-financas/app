import { detectEncryptedPdf } from './pdf-crypto';

const normalPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const encryptedPdfBytes = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Encrypt 2 0 R >>\n%%EOF',
);

describe('detectEncryptedPdf', () => {
  it('returns false for a normal PDF', () => {
    expect(detectEncryptedPdf(normalPdfBytes)).toBe(false);
  });

  it('returns true for a password-protected PDF', () => {
    expect(detectEncryptedPdf(encryptedPdfBytes)).toBe(true);
  });
});
