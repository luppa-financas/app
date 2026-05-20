import { PDFDocument } from 'pdf-lib';

// The /Encrypt entry lives in the PDF trailer, which is near the end of the file.
// Searching the full buffer is the only reliable way to detect it regardless of PDF size.
export function detectEncryptedPdf(bytes: Uint8Array): boolean {
  return Buffer.from(bytes).toString('latin1').includes('/Encrypt');
}

export async function decryptPdf(
  bytes: Uint8Array,
  password: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { password });
  const decrypted = await doc.save();
  // pdf-lib does not validate the password before decrypting — it silently produces
  // garbled output for a wrong password. Re-parsing the result catches that case.
  try {
    await PDFDocument.load(decrypted);
  } catch {
    throw new Error('Senha incorreta');
  }
  return decrypted;
}
