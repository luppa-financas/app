import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesRepository } from './invoices.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  invoice: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
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

  describe('findAllByUserId', () => {
    it('should return invoices ordered by createdAt desc for the given userId', async () => {
      const invoices = [
        { id: 'inv-2', userId: 'user-1', createdAt: new Date('2026-05-10') },
        { id: 'inv-1', userId: 'user-1', createdAt: new Date('2026-05-01') },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(invoices);

      const result = await repository.findAllByUserId('user-1');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
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

      const result = await repository.findByIdWithTransactions('inv-1', 'user-1');

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId: 'user-1' },
        include: { transactions: true },
      });
      expect(result).toBe(invoice);
    });

    it('should return null when invoice belongs to another user', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdWithTransactions('inv-1', 'other-user');

      expect(result).toBeNull();
    });
  });
});
