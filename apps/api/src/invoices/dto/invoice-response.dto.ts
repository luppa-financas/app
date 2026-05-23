import { InvoiceWithDebits } from '../invoices.repository';

export class InvoiceResponseDto {
  id: string;
  filename: string;
  status: string;
  billingMonth: Date;
  total: number;

  static from(invoice: InvoiceWithDebits): InvoiceResponseDto {
    const total = invoice.transactions.reduce(
      (sum, t) => sum + t.amount.toNumber(),
      0,
    );
    return {
      id: invoice.id,
      filename: invoice.filename,
      status: invoice.status,
      billingMonth: invoice.billingMonth,
      total,
    };
  }
}
