import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  TransactionsRepository,
  TransactionCreateData,
} from './transactions.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  transaction: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
};

const transactions: TransactionCreateData[] = [
  {
    date: '2026-04-05',
    description: 'IFOOD',
    amount: 45.9,
    type: 'debit',
    category: 'Alimentação',
    subcategory: 'Delivery',
    confidence: 0.95,
    needsReview: false,
  },
  {
    date: '2026-04-07',
    description: 'UBER',
    amount: 18.5,
    type: 'debit',
    category: 'Transporte',
    subcategory: 'Uber / 99 / Taxi',
    confidence: 0.9,
    needsReview: false,
  },
];

describe('TransactionsRepository', () => {
  let repository: TransactionsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<TransactionsRepository>(TransactionsRepository);
    jest.resetAllMocks();
  });

  describe('createMany', () => {
    it('should create all transactions linked to the invoiceId', async () => {
      mockPrisma.transaction.createMany.mockResolvedValue({ count: 2 });

      await repository.createMany('inv-1', transactions);

      expect(mockPrisma.transaction.createMany).toHaveBeenCalledWith({
        data: transactions.map((t) => ({
          invoiceId: 'inv-1',
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          type: t.type.toUpperCase(),
          category: t.category,
          subcategory: t.subcategory,
          confidence: t.confidence,
          needsReview: t.needsReview,
        })),
      });
    });

    it('should do nothing when transactions list is empty', async () => {
      await repository.createMany('inv-1', []);

      expect(mockPrisma.transaction.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findByInvoice', () => {
    it('should return only transactions for the given invoiceId', async () => {
      const rows = [{ id: 'tx-1', invoiceId: 'inv-1' }];
      mockPrisma.transaction.findMany.mockResolvedValue(rows);

      const result = await repository.findByInvoice('inv-1');

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { invoiceId: 'inv-1' },
      });
      expect(result).toBe(rows);
    });
  });

  describe('countByUserAndDescription', () => {
    it('should return 0 when user has no transactions with that description', async () => {
      mockPrisma.transaction.count.mockResolvedValue(0);

      const result = await repository.countByUserAndDescription(
        'user-1',
        'UBER',
      );

      expect(result).toBe(0);
    });

    it('should return the count of user transactions matching the description', async () => {
      mockPrisma.transaction.count.mockResolvedValue(15);

      const result = await repository.countByUserAndDescription(
        'user-1',
        'UBER',
      );

      expect(result).toBe(15);
    });

    it('should filter by userId via invoice relation (multi-tenancy)', async () => {
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.countByUserAndDescription('user-1', 'UBER');

      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
        where: { description: 'UBER', invoice: { userId: 'user-1' } },
      });
    });

    it('should use exact description match (not partial)', async () => {
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.countByUserAndDescription('user-1', 'UBER');

      const call = mockPrisma.transaction.count.mock.calls[0][0] as {
        where: { description: unknown };
      };
      expect(call.where.description).toBe('UBER');
      expect(typeof call.where.description).toBe('string');
    });
  });

  describe('updateManyByUserAndDescription', () => {
    it('should update category and subcategory of all matching transactions', async () => {
      mockPrisma.transaction.updateMany.mockResolvedValue({ count: 15 });

      await repository.updateManyByUserAndDescription('user-1', 'UBER', {
        category: 'Transporte',
        subcategory: 'Uber / 99 / Taxi',
      });

      expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { description: 'UBER', invoice: { userId: 'user-1' } },
        data: {
          category: 'Transporte',
          subcategory: 'Uber / 99 / Taxi',
          needsReview: false,
        },
      });
    });

    it('should return the number of transactions updated', async () => {
      mockPrisma.transaction.updateMany.mockResolvedValue({ count: 15 });

      const result = await repository.updateManyByUserAndDescription(
        'user-1',
        'UBER',
        { category: 'Transporte', subcategory: 'Uber / 99 / Taxi' },
      );

      expect(result).toBe(15);
    });

    it('should filter by userId via invoice relation (multi-tenancy)', async () => {
      mockPrisma.transaction.updateMany.mockResolvedValue({ count: 0 });

      await repository.updateManyByUserAndDescription('user-1', 'UBER', {
        category: 'Transporte',
        subcategory: null,
      });

      const call = mockPrisma.transaction.updateMany.mock.calls[0][0] as {
        where: { invoice: { userId: string } };
      };
      expect(call.where.invoice).toEqual({ userId: 'user-1' });
    });

    it('should use the provided transaction client when given', async () => {
      const tx = {
        transaction: {
          updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.updateManyByUserAndDescription(
        'user-1',
        'UBER',
        { category: 'Transporte', subcategory: null },
        tx,
      );

      expect(tx.transaction.updateMany).toHaveBeenCalled();
      expect(mockPrisma.transaction.updateMany).not.toHaveBeenCalled();
      expect(result).toBe(3);
    });

    it('should set needsReview to false on updated transactions', async () => {
      mockPrisma.transaction.updateMany.mockResolvedValue({ count: 0 });

      await repository.updateManyByUserAndDescription('user-1', 'UBER', {
        category: 'Transporte',
        subcategory: null,
      });

      const call = mockPrisma.transaction.updateMany.mock.calls[0][0] as {
        data: { needsReview: boolean };
      };
      expect(call.data.needsReview).toBe(false);
    });
  });
});
