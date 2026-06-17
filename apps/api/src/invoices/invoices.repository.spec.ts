import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoicesRepository } from './invoices.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  invoice: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  transaction: {
    groupBy: jest.fn(),
  },
};

describe('InvoicesRepository', () => {
  let repository: InvoicesRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<InvoicesRepository>(InvoicesRepository);
  });

  describe('create', () => {
    it('should create an invoice with PENDING status (billingMonth filled later by the listener) and return it', async () => {
      const invoice = {
        id: 'inv-1',
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'invoices/user-1/fatura.pdf',
        status: 'PENDING',
        billingMonth: null,
        createdAt: new Date(),
      };
      mockPrisma.invoice.create.mockResolvedValue(invoice);

      const result = await repository.create({
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'invoices/user-1/fatura.pdf',
      });

      expect(result).toEqual(invoice);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          filename: 'fatura.pdf',
          storagePath: 'invoices/user-1/fatura.pdf',
        },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update only status when no extra fields provided', async () => {
      mockPrisma.invoice.update.mockResolvedValue({});

      await repository.updateStatus('inv-1', 'FAILED');

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'FAILED' },
      });
    });

    it('should update status, billingMonth, bank and invoiceTotal when all provided', async () => {
      mockPrisma.invoice.update.mockResolvedValue({});
      const billingMonth = new Date('2026-04-01T00:00:00.000Z');

      await repository.updateStatus('inv-1', 'DONE', {
        billingMonth,
        bank: 'itau',
        invoiceTotal: 1234.56,
      });

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'DONE', billingMonth, bank: 'itau', invoiceTotal: 1234.56 },
      });
    });

    it('should update only status and billingMonth when only billingMonth provided', async () => {
      mockPrisma.invoice.update.mockResolvedValue({});
      const billingMonth = new Date('2026-05-01T00:00:00.000Z');

      await repository.updateStatus('inv-1', 'DONE', { billingMonth });

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'DONE', billingMonth },
      });
    });
  });

  describe('findById', () => {
    it('should return the invoice when userId matches', async () => {
      const invoice = { id: 'inv-1', userId: 'user-1' };
      mockPrisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await repository.findById('inv-1', 'user-1');

      expect(result).toEqual(invoice);
      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId: 'user-1' },
      });
    });

    it('should return null when userId does not match', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await repository.findById('inv-1', 'wrong-user');

      expect(result).toBeNull();
    });
  });

  describe('findAllByUserIdWithDebits', () => {
    it('should query invoices including only DEBIT transactions', async () => {
      const invoices = [
        {
          id: 'inv-1',
          userId: 'user-1',
          transactions: [{ amount: '150.00' }],
        },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(invoices);

      const result = await repository.findAllByUserIdWithDebits('user-1');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            where: { type: 'DEBIT' },
            select: { amount: true },
          },
        },
      });
      expect(result).toBe(invoices);
    });
  });

  describe('findByIdWithTransactions', () => {
    it('should return invoice with transactions when userId matches', async () => {
      const invoice = {
        id: 'inv-1',
        userId: 'user-1',
        transactions: [{ id: 'tx-1', amount: 45.9 }],
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await repository.findByIdWithTransactions(
        'inv-1',
        'user-1',
      );

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId: 'user-1' },
        include: { transactions: true },
      });
      expect(result).toBe(invoice);
    });

    it('should return null when invoice belongs to another user', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdWithTransactions(
        'inv-1',
        'other-user',
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should call prisma.invoice.delete with id and userId', async () => {
      mockPrisma.invoice.delete.mockResolvedValue({});

      await repository.deleteById('inv-1', 'user-1');

      expect(mockPrisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId: 'user-1' },
      });
    });
  });

  describe('findAllWithFilters', () => {
    it('isolates by userId', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findAllWithFilters('user-1', {});

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }) as unknown,
        }),
      );
    });

    it('applies month as [start, end) date range on billingMonth', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findAllWithFilters('user-1', { month: '2026-05' });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            billingMonth: {
              gte: new Date('2026-05-01T00:00:00.000Z'),
              lt: new Date('2026-06-01T00:00:00.000Z'),
            },
          }) as unknown,
        }),
      );
    });

    it('applies bank filter', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findAllWithFilters('user-1', { bank: 'itau' });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ bank: 'itau' }) as unknown,
        }),
      );
    });

    it('applies status filter', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findAllWithFilters('user-1', { status: 'DONE' });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DONE' }) as unknown,
        }),
      );
    });

    it('omits undefined filters from where clause', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findAllWithFilters('user-1', {});

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('includes transaction count in the result', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findAllWithFilters('user-1', {});

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { transactions: true } },
          }) as unknown,
        }),
      );
    });
  });

  describe('findHistory', () => {
    it('filters by userId and DONE status', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findHistory('user-1', 6);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: 'DONE',
          }) as unknown,
        }),
      );
    });

    it('restricts to the last N months using billingMonth gte', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findHistory('user-1', 3);

      const callArg = mockPrisma.invoice.findMany.mock.calls[0][0] as {
        where: { billingMonth: { gte: Date } };
      };
      expect(callArg.where.billingMonth.gte).toBeInstanceOf(Date);
    });

    it('selects only billingMonth, bank and invoiceTotal fields', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await repository.findHistory('user-1', 6);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { billingMonth: true, bank: true, invoiceTotal: true },
        }),
      );
    });

    it('returns the raw result from prisma', async () => {
      const rows = [
        { billingMonth: new Date('2026-05-01'), bank: 'itau', invoiceTotal: new Decimal('8000') },
        { billingMonth: new Date('2026-05-01'), bank: 'nubank', invoiceTotal: new Decimal('1200') },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(rows);

      const result = await repository.findHistory('user-1', 6);

      expect(result).toBe(rows);
    });
  });

  describe('findSummaryByMonth', () => {
    it('queries invoices for userId and month then groups transactions by category', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        { id: 'inv-1' },
        { id: 'inv-2' },
      ]);
      mockPrisma.transaction.groupBy.mockResolvedValue([
        {
          category: 'Alimentação',
          subcategory: 'Delivery',
          _sum: { amount: new Decimal('216.00') },
        },
      ]);

      const result = await repository.findSummaryByMonth('user-1', '2026-05');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'DONE',
          billingMonth: {
            gte: new Date('2026-05-01T00:00:00.000Z'),
            lt: new Date('2026-06-01T00:00:00.000Z'),
          },
        },
        select: { id: true },
      });
      expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith({
        by: ['category', 'subcategory'],
        where: { invoiceId: { in: ['inv-1', 'inv-2'] }, type: 'DEBIT' },
        _sum: { amount: true },
      });
      expect(result).toEqual([
        {
          category: 'Alimentação',
          subcategory: 'Delivery',
          _sum: { amount: new Decimal('216.00') },
        },
      ]);
    });

    it('returns empty array when user has no invoices in that month', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.transaction.groupBy.mockResolvedValue([]);

      const result = await repository.findSummaryByMonth('user-1', '2026-05');

      expect(result).toEqual([]);
      expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { invoiceId: { in: [] }, type: 'DEBIT' },
        }),
      );
    });
  });
});
