import { InvoiceDetailResponseDto } from './invoice-detail-response.dto';
import { InvoiceStatus, TransactionType } from '@prisma/client';
import { InvoiceWithTransactions } from '../invoices.repository';

const base = {
  id: 'inv-1',
  userId: 'user-1',
  filename: 'fatura.pdf',
  storagePath: 'dev/user-1/fatura.pdf',
  status: InvoiceStatus.DONE,
  billingMonth: new Date('2025-09-01'),
  createdAt: new Date('2026-05-01'),
  transactions: [
    {
      id: 'tx-1',
      invoiceId: 'inv-1',
      date: new Date('2025-09-15'),
      description: 'Mercado',
      alias: null,
      amount: 49.9,
      type: TransactionType.DEBIT,
      category: 'Food',
      subcategory: null,
      confidence: 0.95,
      needsReview: false,
      createdAt: new Date('2026-05-01'),
    },
  ],
} as unknown as InvoiceWithTransactions;

describe('InvoiceDetailResponseDto.from', () => {
  it('includes billingMonth', () => {
    const dto = InvoiceDetailResponseDto.from(base);
    expect(dto.billingMonth).toEqual(new Date('2025-09-01'));
  });
});
