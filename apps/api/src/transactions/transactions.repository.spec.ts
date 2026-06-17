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

      expect(mockPrisma.transaction.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ description: 'UBER' }) as unknown,
        }),
      );
    });
  });

  describe('findPaginated', () => {
    it('returns { data, total }', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await repository.findPaginated('user-1', {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ data: [{ id: 'tx-1' }], total: 1 });
    });

    it('isolates by userId via invoice relation', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', { page: 1, limit: 20 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({ userId: 'user-1' }) as unknown,
          }) as unknown,
        }),
      );
    });

    it('applies month as billingMonth date range on invoice', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', {
        month: '2026-05',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              billingMonth: {
                gte: new Date('2026-05-01T00:00:00.000Z'),
                lt: new Date('2026-06-01T00:00:00.000Z'),
              },
            }) as unknown,
          }) as unknown,
        }),
      );
    });

    it('applies bank filter via invoice relation', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', {
        bank: 'nubank',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({ bank: 'nubank' }) as unknown,
          }) as unknown,
        }),
      );
    });

    it('applies category filter', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', {
        category: 'Alimentação',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Alimentação',
          }) as unknown,
        }),
      );
    });

    it('applies subcategory filter', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', {
        subcategory: 'Delivery',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subcategory: 'Delivery',
          }) as unknown,
        }),
      );
    });

    it('applies text search q on description and alias with case-insensitive OR', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', {
        q: 'uber',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { description: { contains: 'uber', mode: 'insensitive' } },
              { alias: { contains: 'uber', mode: 'insensitive' } },
            ],
          }) as unknown,
        }),
      );
    });

    it('paginates with skip=(page-1)*limit and take=limit', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', { page: 3, limit: 10 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('orders by date descending', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await repository.findPaginated('user-1', { page: 1, limit: 20 });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date: 'desc' } }),
      );
    });

    it('uses the same where clause for both findMany and count', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(5);

      await repository.findPaginated('user-1', {
        category: 'Transporte',
        page: 2,
        limit: 10,
      });

      const findManyCalls = mockPrisma.transaction.findMany.mock.calls as Array<
        [{ where: unknown }]
      >;
      const [findManyCall] = findManyCalls[0];
      const findManyWhere = findManyCall.where;
      const countCalls = mockPrisma.transaction.count.mock.calls as Array<
        [{ where: unknown }]
      >;
      const [countCall] = countCalls[0];
      const countWhere = countCall.where;

      expect(findManyWhere).toEqual(countWhere);
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

      expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: { userId: 'user-1' },
          }) as unknown,
        }),
      );
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

      // eslint-disable-next-line @typescript-eslint/unbound-method
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

      expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ needsReview: false }) as unknown,
        }),
      );
    });
  });
});
