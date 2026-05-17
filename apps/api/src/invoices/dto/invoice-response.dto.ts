import { Invoice } from '@prisma/client';

export class InvoiceResponseDto {
  id: string;
  filename: string;
  status: string;
  createdAt: Date;

  static from(invoice: Invoice): InvoiceResponseDto {
    return {
      id: invoice.id,
      filename: invoice.filename,
      status: invoice.status,
      createdAt: invoice.createdAt,
    };
  }
}
