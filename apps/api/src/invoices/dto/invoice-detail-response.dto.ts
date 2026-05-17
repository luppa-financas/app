import { Transaction } from '@prisma/client';
import { InvoiceWithTransactions } from '../invoices.repository';

class TransactionDto {
  date: Date;
  description: string;
  amount: number;
  type: string;
  category: string | null;

  static from(t: Transaction): TransactionDto {
    return {
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
    };
  }
}

export class InvoiceDetailResponseDto {
  id: string;
  filename: string;
  status: string;
  createdAt: Date;
  transactions: TransactionDto[];

  static from(invoice: InvoiceWithTransactions): InvoiceDetailResponseDto {
    return {
      id: invoice.id,
      filename: invoice.filename,
      status: invoice.status,
      createdAt: invoice.createdAt,
      transactions: invoice.transactions.map((t) => TransactionDto.from(t)),
    };
  }
}
