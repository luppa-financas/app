import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceResponseDto } from './invoice-response.dto';
import { Invoice, InvoiceStatus, TransactionType } from '@prisma/client';

const base: Invoice = {
  id: 'inv-1',
  userId: 'user-1',
  filename: 'fatura.pdf',
  storagePath: 'dev/user-1/fatura.pdf',
  status: InvoiceStatus.DONE,
  bank: null,
  billingMonth: new Date('2025-09-01'),
  invoiceTotal: null,
  createdAt: new Date('2026-05-01'),
};

const debit = (amount: string) => ({
  amount: new Decimal(amount),
  type: TransactionType.DEBIT,
});

describe('InvoiceResponseDto.from', () => {
  it('includes billingMonth', () => {
    const dto = InvoiceResponseDto.from({ ...base, transactions: [] });
    expect(dto.billingMonth).toEqual(new Date('2025-09-01'));
  });

  it('forwards null billingMonth (invoice still PENDING)', () => {
    const dto = InvoiceResponseDto.from({
      ...base,
      billingMonth: null,
      transactions: [],
    });
    expect(dto.billingMonth).toBeNull();
  });

  it('excludes createdAt', () => {
    const dto = InvoiceResponseDto.from({ ...base, transactions: [] });
    expect(
      (dto as unknown as Record<string, unknown>).createdAt,
    ).toBeUndefined();
  });

  it('total is the sum of debit transaction amounts', () => {
    const dto = InvoiceResponseDto.from({
      ...base,
      transactions: [debit('100.50'), debit('49.50')],
    });
    expect(dto.total).toBeCloseTo(150);
  });

  it('total is 0 when there are no transactions', () => {
    const dto = InvoiceResponseDto.from({ ...base, transactions: [] });
    expect(dto.total).toBe(0);
  });
});
