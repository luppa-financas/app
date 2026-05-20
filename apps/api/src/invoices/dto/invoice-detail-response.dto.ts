import { Transaction } from '@prisma/client';
import { InvoiceWithTransactions } from '../invoices.repository';

class TransactionDto {
  id: string;
  date: Date;
  description: string;
  alias: string | null;
  amount: number;
  type: string;
  category: string | null;
  subcategory: string | null;
  confidence: number | null;
  needsReview: boolean;

  static from(t: Transaction): TransactionDto {
    return {
      id: t.id,
      date: t.date,
      description: t.description,
      alias: t.alias,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      subcategory: t.subcategory,
      confidence: t.confidence,
      needsReview: t.needsReview,
    };
  }
}

export class InvoiceDetailResponseDto {
  id: string;
  filename: string;
  status: string;
  billingMonth: Date;
  transactions: TransactionDto[];

  static from(invoice: InvoiceWithTransactions): InvoiceDetailResponseDto {
    return {
      id: invoice.id,
      filename: invoice.filename,
      status: invoice.status,
      billingMonth: invoice.billingMonth,
      transactions: invoice.transactions.map((t) => TransactionDto.from(t)),
    };
  }
}
