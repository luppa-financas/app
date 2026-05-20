import { InvoiceResponseDto } from './invoice-response.dto';
import { Invoice, InvoiceStatus } from '@prisma/client';

const base: Invoice = {
  id: 'inv-1',
  userId: 'user-1',
  filename: 'fatura.pdf',
  storagePath: 'dev/user-1/fatura.pdf',
  status: InvoiceStatus.DONE,
  billingMonth: new Date('2025-09-01'),
  createdAt: new Date('2026-05-01'),
};

describe('InvoiceResponseDto.from', () => {
  it('includes billingMonth', () => {
    const dto = InvoiceResponseDto.from(base);
    expect(dto.billingMonth).toEqual(new Date('2025-09-01'));
  });

  it('excludes createdAt', () => {
    const dto = InvoiceResponseDto.from(base);
    expect((dto as unknown as Record<string, unknown>).createdAt).toBeUndefined();
  });
});
