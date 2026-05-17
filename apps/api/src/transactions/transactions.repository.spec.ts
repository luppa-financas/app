import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsRepository } from './transactions.repository';
import { PrismaService } from '../prisma/prisma.service';
import { ExtractedTransaction } from '../extraction/extraction.types';

const mockPrisma = {
  transaction: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
};

const transactions: ExtractedTransaction[] = [
  { date: '2026-04-05', description: 'IFOOD', amount: 45.9, type: 'debit', category: 'Other' },
  { date: '2026-04-07', description: 'UBER', amount: 18.5, type: 'debit', category: 'Other' },
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
});
