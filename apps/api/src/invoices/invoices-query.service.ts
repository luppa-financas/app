import { Injectable } from '@nestjs/common';
import { InvoicesRepository } from './invoices.repository';

export interface InvoiceListItemDto {
  id: string;
  filename: string;
  status: string;
  bank: string | null;
  billingMonth: Date | null;
  invoiceTotal: number | null;
  total: number;
  transactionCount: number;
  createdAt: Date;
}

export interface HistoryItemDto {
  month: string;
  byBank: Record<string, number>;
}

export interface SummaryDto {
  total: number;
  byCategory: {
    category: string | null;
    subcategory: string | null;
    amount: number;
  }[];
}

@Injectable()
export class InvoicesQueryService {
  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  async list(
    userId: string,
    filters: { month?: string; bank?: string; status?: string },
  ): Promise<InvoiceListItemDto[]> {
    const rows = await this.invoicesRepository.findAllWithFilters(
      userId,
      filters,
    );
    return rows.map((inv) => {
      const invoiceTotal = inv.invoiceTotal
        ? inv.invoiceTotal.toNumber()
        : null;
      const transactionSum = inv.transactions.reduce(
        (sum, t) => sum + t.amount.toNumber(),
        0,
      );
      return {
        id: inv.id,
        filename: inv.filename,
        status: inv.status,
        bank: inv.bank ?? null,
        billingMonth: inv.billingMonth,
        invoiceTotal,
        // invoiceTotal is null for invoices processed before the field was added; fall back to DEBIT sum
        total: invoiceTotal ?? transactionSum,
        transactionCount: inv._count.transactions,
        createdAt: inv.createdAt,
      };
    });
  }

  async history(userId: string, months: number): Promise<HistoryItemDto[]> {
    const rows = await this.invoicesRepository.findHistory(userId, months);

    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      if (!row.billingMonth || !row.bank || row.invoiceTotal == null) continue;
      const month = row.billingMonth.toISOString().slice(0, 7);
      const byBank = map.get(month) ?? {};
      byBank[row.bank] = (byBank[row.bank] ?? 0) + row.invoiceTotal.toNumber();
      map.set(month, byBank);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, byBank]) => ({ month, byBank }));
  }

  async summary(userId: string, month: string): Promise<SummaryDto> {
    const groups = await this.invoicesRepository.findSummaryByMonth(
      userId,
      month,
    );

    const byCategory = groups
      .map((g) => ({
        category: g.category,
        subcategory: g.subcategory,
        amount: g._sum.amount ? g._sum.amount.toNumber() : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = byCategory.reduce((sum, c) => sum + c.amount, 0);
    return { total, byCategory };
  }
}
