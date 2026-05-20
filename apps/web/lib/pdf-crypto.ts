// The /Encrypt entry lives in the PDF trailer, which is near the end of the file.
// Searching the full buffer is the only reliable way to detect it regardless of PDF size.
export function detectEncryptedPdf(bytes: Uint8Array): boolean {
  return Buffer.from(bytes).toString('latin1').includes('/Encrypt');
}
