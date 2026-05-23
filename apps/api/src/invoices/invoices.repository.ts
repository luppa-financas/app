import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Invoice, InvoiceStatus, Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateInvoiceData {
  userId: string;
  filename: string;
  storagePath: string;
  billingMonth: Date;
}

export type InvoiceWithTransactions = Invoice & { transactions: Transaction[] };
export type InvoiceWithDebits = Invoice & { transactions: { amount: Decimal }[] };

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvoiceData): Promise<Invoice> {
    return this.prisma.invoice.create({ data });
  }

  async findById(id: string, userId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({ where: { id, userId } });
  }

  async findAllByUserIdWithDebits(userId: string): Promise<InvoiceWithDebits[]> {
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

  async updateStatus(id: string, status: InvoiceStatus): Promise<void> {
    await this.prisma.invoice.update({ where: { id }, data: { status } });
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id, userId } });
  }
}
