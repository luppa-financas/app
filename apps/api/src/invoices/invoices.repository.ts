import { Injectable } from '@nestjs/common';
import { Invoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateInvoiceData {
  userId: string;
  filename: string;
  storagePath: string;
}

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvoiceData): Promise<Invoice> {
    return this.prisma.invoice.create({ data });
  }

  async findById(id: string, userId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({ where: { id, userId } });
  }
}
