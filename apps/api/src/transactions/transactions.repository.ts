import { Injectable } from '@nestjs/common';
import { Prisma, Transaction, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FindPaginatedFilters {
  month?: string;
  bank?: string;
  category?: string;
  subcategory?: string;
  q?: string;
  page: number;
  limit: number;
}

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

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: { id, invoice: { userId } },
    });
  }

  async update(
    id: string,
    data: {
      alias?: string;
      category?: string;
      subcategory?: string | null;
      needsReview?: boolean;
    },
  ): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  async findPaginated(
    userId: string,
    filters: FindPaginatedFilters,
  ): Promise<{ data: Transaction[]; total: number }> {
    const invoiceWhere: Record<string, unknown> = { userId };
    if (filters.month) {
      const start = new Date(`${filters.month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      invoiceWhere.billingMonth = { gte: start, lt: end };
    }
    if (filters.bank) invoiceWhere.bank = filters.bank;

    const where: Record<string, unknown> = { invoice: invoiceWhere };
    if (filters.category) where.category = filters.category;
    if (filters.subcategory) where.subcategory = filters.subcategory;
    if (filters.q) {
      where.OR = [
        { description: { contains: filters.q, mode: 'insensitive' } },
        { alias: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const skip = (filters.page - 1) * filters.limit;
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total };
  }

  async countByUserAndDescription(
    userId: string,
    description: string,
  ): Promise<number> {
    return this.prisma.transaction.count({
      where: { description, invoice: { userId } },
    });
  }

  async updateManyByUserAndDescription(
    userId: string,
    description: string,
    data: { category: string; subcategory: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.transaction.updateMany({
      where: { description, invoice: { userId } },
      data: {
        category: data.category,
        subcategory: data.subcategory,
        needsReview: false,
      },
    });
    return result.count;
  }
}
