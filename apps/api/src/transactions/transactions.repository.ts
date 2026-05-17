import { Injectable } from '@nestjs/common';
import { Transaction, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TransactionCreateData {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  subcategory: string | null;
  confidence: number;
  needsReview: boolean;
}

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    invoiceId: string,
    transactions: TransactionCreateData[],
  ): Promise<void> {
    if (transactions.length === 0) return;

    await this.prisma.transaction.createMany({
      data: transactions.map((t) => ({
        invoiceId,
        date: new Date(t.date),
        description: t.description,
        amount: t.amount,
        type: t.type.toUpperCase() as TransactionType,
        category: t.category,
        subcategory: t.subcategory,
        confidence: t.confidence,
        needsReview: t.needsReview,
      })),
    });
  }

  async findByInvoice(invoiceId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({ where: { invoiceId } });
  }
}
