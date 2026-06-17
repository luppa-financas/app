import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Invoice, InvoiceStatus, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateInvoiceData {
  userId: string;
  filename: string;
  storagePath: string;
}

interface UpdateStatusExtra {
  billingMonth?: Date;
  bank?: string;
  invoiceTotal?: number;
}

interface FindAllFilters {
  month?: string;
  bank?: string;
  status?: string;
}

export type InvoiceWithTransactions = Invoice & { transactions: Transaction[] };
export type InvoiceWithDebits = Invoice & {
  transactions: { amount: Decimal }[];
};
export type InvoiceWithCount = Invoice & {
  _count: { transactions: number };
  transactions: { amount: Decimal }[];
};
export type InvoiceHistoryRow = {
  billingMonth: Date | null;
  bank: string | null;
  invoiceTotal: Decimal | null;
};

export type CategoryGroupRow = {
  category: string | null;
  subcategory: string | null;
  _sum: { amount: Decimal | null };
};

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvoiceData): Promise<Invoice> {
    return this.prisma.invoice.create({ data });
  }

  async findById(id: string, userId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({ where: { id, userId } });
  }

  async findAllByUserIdWithDebits(
    userId: string,
  ): Promise<InvoiceWithDebits[]> {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          where: { type: 'DEBIT' },
          select: { amount: true },
        },
      },
    });
  }

  async findByIdWithTransactions(
    id: string,
    userId: string,
  ): Promise<InvoiceWithTransactions | null> {
    return this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { transactions: true },
    });
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    extra?: UpdateStatusExtra,
  ): Promise<void> {
    const data: Record<string, unknown> = { status };
    if (extra?.billingMonth) data.billingMonth = extra.billingMonth;
    if (extra?.bank) data.bank = extra.bank;
    if (extra?.invoiceTotal !== undefined) data.invoiceTotal = extra.invoiceTotal;
    await this.prisma.invoice.update({ where: { id }, data });
  }

  async findAllWithFilters(
    userId: string,
    filters: FindAllFilters,
  ): Promise<InvoiceWithCount[]> {
    const where: Record<string, unknown> = { userId };
    if (filters.month) {
      const start = new Date(`${filters.month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      where.billingMonth = { gte: start, lt: end };
    }
    if (filters.bank) where.bank = filters.bank;
    if (filters.status) where.status = filters.status;

    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { transactions: true } },
        transactions: { where: { type: 'DEBIT' }, select: { amount: true } },
      },
    }) as Promise<InvoiceWithCount[]>;
  }

  async findHistory(userId: string, months: number): Promise<InvoiceHistoryRow[]> {
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - months);
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);

    return this.prisma.invoice.findMany({
      where: { userId, status: InvoiceStatus.DONE, billingMonth: { gte: since } },
      select: { billingMonth: true, bank: true, invoiceTotal: true },
    }) as Promise<InvoiceHistoryRow[]>;
  }

  async findSummaryByMonth(
    userId: string,
    month: string,
  ): Promise<CategoryGroupRow[]> {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        status: InvoiceStatus.DONE,
        billingMonth: { gte: start, lt: end },
      },
      select: { id: true },
    });
    const ids = invoices.map((i) => i.id);

    return this.prisma.transaction.groupBy({
      by: ['category', 'subcategory'],
      where: { invoiceId: { in: ids }, type: 'DEBIT' },
      _sum: { amount: true },
    }) as unknown as Promise<CategoryGroupRow[]>;
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id, userId } });
  }
}
