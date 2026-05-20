import { detectEncryptedPdf, decryptPdf } from './pdf-crypto';

const normalPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const encryptedPdfBytes = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Encrypt 2 0 R >>\n%%EOF',
);

jest.mock('pdf-lib', () => {
  const mockSave = jest.fn();
  const mockLoad = jest.fn();
  return { PDFDocument: { load: mockLoad }, __mockLoad: mockLoad, __mockSave: mockSave };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfLibMock = require('pdf-lib') as { __mockLoad: jest.Mock; __mockSave: jest.Mock };

describe('detectEncryptedPdf', () => {
  it('returns false for a normal PDF', () => {
    expect(detectEncryptedPdf(normalPdfBytes)).toBe(false);
  });

  it('returns true for a password-protected PDF', () => {
    expect(detectEncryptedPdf(encryptedPdfBytes)).toBe(true);
  });
});

describe('decryptPdf', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns decrypted bytes when password is correct', async () => {
    const decryptedBytes = new Uint8Array([1, 2, 3]);
    const mockSave = jest.fn().mockResolvedValue(decryptedBytes);
    pdfLibMock.__mockLoad
      .mockResolvedValueOnce({ save: mockSave })
      .mockResolvedValueOnce({});

    const result = await decryptPdf(encryptedPdfBytes, 'secret');

    expect(pdfLibMock.__mockLoad).toHaveBeenCalledWith(encryptedPdfBytes, { password: 'secret' });
    expect(result).toBe(decryptedBytes);
  });

  it('throws when password is incorrect', async () => {
    const garbageBytes = new Uint8Array([0, 0, 0]);
    const mockSave = jest.fn().mockResolvedValue(garbageBytes);
    pdfLibMock.__mockLoad
      .mockResolvedValueOnce({ save: mockSave })
      .mockRejectedValueOnce(new Error('invalid PDF'));

    await expect(decryptPdf(encryptedPdfBytes, 'wrong')).rejects.toThrow('Senha incorreta');
  });
});
