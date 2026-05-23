import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesRepository } from './invoices.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  invoice: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
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
    it('should create an invoice with PENDING status and return it', async () => {
      const invoice = {
        id: 'inv-1',
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'invoices/user-1/fatura.pdf',
        status: 'PENDING',
        createdAt: new Date(),
      };
      mockPrisma.invoice.create.mockResolvedValue(invoice);

      const billingMonth = new Date('2025-09-01');
      const result = await repository.create({
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'invoices/user-1/fatura.pdf',
        billingMonth,
      });

      expect(result).toEqual(invoice);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          filename: 'fatura.pdf',
          storagePath: 'invoices/user-1/fatura.pdf',
          billingMonth,
        },
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
});
