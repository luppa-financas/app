import { InvoiceWithDebits } from '../invoices.repository';

export class InvoiceResponseDto {
  id: string;
  filename: string;
  name: string | null;
  status: string;
  billingMonth: Date | null;
  total: number;

  static from(invoice: InvoiceWithDebits): InvoiceResponseDto {
    const total = invoice.transactions.reduce(
      (sum, t) => sum + t.amount.toNumber(),
      0,
    );
    return {
      id: invoice.id,
      filename: invoice.filename,
      name: invoice.name ?? null,
      status: invoice.status,
      billingMonth: invoice.billingMonth,
      total,
    };
  }
}
