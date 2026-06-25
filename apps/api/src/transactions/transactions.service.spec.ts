import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantRuleSource, Prisma } from '@prisma/client';
import { MerchantRulesRepository } from '../merchant-rules/merchant-rules.repository';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

const mockTransactionsRepository = {
  findByIdAndUserId: jest.fn(),
  update: jest.fn(),
  countByUserAndDescription: jest.fn(),
  updateManyByUserAndDescription: jest.fn(),
  findPaginated: jest.fn(),
};

const mockMerchantRulesRepository = {
  upsert: jest.fn(),
};

const mockTx = { __mock: 'tx' } as unknown as Prisma.TransactionClient;
const mockPrisma = {
  $transaction: jest.fn(
    async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) =>
      callback(mockTx),
  ),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionsRepository,
          useValue: mockTransactionsRepository,
        },
        {
          provide: MerchantRulesRepository,
          useValue: mockMerchantRulesRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) =>
        callback(mockTx),
    );
  });

  describe('update', () => {
    const userId = 'user-1';
    const transactionId = 'tx-1';
    const existingTransaction = {
      id: transactionId,
      description: 'UBER EATS',
      alias: null,
      category: 'Outros',
      subcategory: null,
      needsReview: true,
    };
    const dto: UpdateTransactionDto = {
      alias: 'Uber Eats',
      category: 'Alimentação',
      subcategory: 'Delivery',
    };

    beforeEach(() => {
      mockTransactionsRepository.findByIdAndUserId.mockResolvedValue(
        existingTransaction,
      );
      mockTransactionsRepository.update.mockResolvedValue({
        ...existingTransaction,
        ...dto,
        needsReview: false,
      });
    });

    it('updates alias, category and subcategory on the transaction', async () => {
      await service.update(transactionId, userId, dto);

      expect(mockTransactionsRepository.update).toHaveBeenCalledWith(
        transactionId,
        expect.objectContaining({
          alias: dto.alias,
          category: dto.category,
          subcategory: dto.subcategory,
        }),
      );
    });

    it('clears needsReview when saving', async () => {
      await service.update(transactionId, userId, dto);

      expect(mockTransactionsRepository.update).toHaveBeenCalledWith(
        transactionId,
        expect.objectContaining({ needsReview: false }),
      );
    });

    it('throws NotFoundException when transaction does not belong to userId', async () => {
      mockTransactionsRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.update(transactionId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('upserts MerchantRule with userId, description as pattern, category, subcategory, confidence 1.0 and USER_CORRECTION source', async () => {
      await service.update(transactionId, userId, dto);

      expect(mockMerchantRulesRepository.upsert).toHaveBeenCalledWith({
        userId,
        pattern: existingTransaction.description,
        category: dto.category,
        subcategory: dto.subcategory,
        confidence: 1.0,
        source: MerchantRuleSource.USER_CORRECTION,
      });
    });

    it('updates existing MerchantRule when same (userId, pattern) already exists', async () => {
      const secondDto: UpdateTransactionDto = {
        category: 'Transporte',
        subcategory: null,
      };
      mockTransactionsRepository.update.mockResolvedValue({
        ...existingTransaction,
        ...secondDto,
        needsReview: false,
      });

      await service.update(transactionId, userId, secondDto);

      expect(mockMerchantRulesRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          pattern: existingTransaction.description,
          category: 'Transporte',
          subcategory: null,
        }),
      );
    });
  });

  describe('findMany', () => {
    it('delegates to repository with userId and filters', async () => {
      mockTransactionsRepository.findPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findMany('user-1', {
        month: '2026-05',
        bank: 'itau',
        page: 1,
        limit: 20,
      });

      expect(mockTransactionsRepository.findPaginated).toHaveBeenCalledWith(
        'user-1',
        { month: '2026-05', bank: 'itau', page: 1, limit: 20 },
      );
    });

    it('returns { data, total } from repository', async () => {
      const rows = [{ id: 'tx-1' }];
      mockTransactionsRepository.findPaginated.mockResolvedValue({
        data: rows,
        total: 1,
      });

      const result = await service.findMany('user-1', { page: 1, limit: 20 });

      expect(result).toEqual({ data: rows, total: 1 });
    });

    it('defaults page to 1 and limit to 20 when not provided', async () => {
      mockTransactionsRepository.findPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findMany('user-1', {});

      expect(mockTransactionsRepository.findPaginated).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('forwards sort: date and order: asc to the repository', async () => {
      mockTransactionsRepository.findPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findMany('user-1', { page: 1, limit: 15, sort: 'date', order: 'asc' });

      expect(mockTransactionsRepository.findPaginated).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ sort: 'date', order: 'asc' }),
      );
    });

    it('forwards sort: amount and order: desc to the repository', async () => {
      mockTransactionsRepository.findPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findMany('user-1', { page: 1, limit: 15, sort: 'amount', order: 'desc' });

      expect(mockTransactionsRepository.findPaginated).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ sort: 'amount', order: 'desc' }),
      );
    });

    it('omits sort and order when not provided', async () => {
      mockTransactionsRepository.findPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findMany('user-1', { page: 1, limit: 20 });

      const call = (mockTransactionsRepository.findPaginated.mock.calls as unknown[][])[0][1] as Record<string, unknown>;
      expect(call.sort).toBeUndefined();
      expect(call.order).toBeUndefined();
    });
  });

  describe('countByDescription', () => {
    it('delegates to repository and returns the count', async () => {
      mockTransactionsRepository.countByUserAndDescription.mockResolvedValue(
        15,
      );

      const result = await service.countByDescription('user-1', 'UBER');

      expect(
        mockTransactionsRepository.countByUserAndDescription,
      ).toHaveBeenCalledWith('user-1', 'UBER');
      expect(result).toBe(15);
    });
  });

  describe('bulkCategorize', () => {
    const userId = 'user-1';
    const dto = {
      description: 'UBER',
      category: 'Transporte',
      subcategory: 'Uber / 99 / Taxi',
    };

    beforeEach(() => {
      mockTransactionsRepository.updateManyByUserAndDescription.mockResolvedValue(
        15,
      );
      mockMerchantRulesRepository.upsert.mockResolvedValue(undefined);
    });

    it('calls updateManyByUserAndDescription with description, category and tx client', async () => {
      await service.bulkCategorize(userId, dto);

      expect(
        mockTransactionsRepository.updateManyByUserAndDescription,
      ).toHaveBeenCalledWith(
        userId,
        dto.description,
        { category: dto.category, subcategory: dto.subcategory },
        mockTx,
      );
    });

    it('upserts a MerchantRule with USER_CORRECTION source and confidence 1.0', async () => {
      await service.bulkCategorize(userId, dto);

      expect(mockMerchantRulesRepository.upsert).toHaveBeenCalledWith(
        {
          userId,
          pattern: dto.description,
          category: dto.category,
          subcategory: dto.subcategory,
          confidence: 1.0,
          source: MerchantRuleSource.USER_CORRECTION,
        },
        mockTx,
      );
    });

    it('runs updateMany and upsert atomically inside prisma.$transaction', async () => {
      await service.bulkCategorize(userId, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(
        mockTransactionsRepository.updateManyByUserAndDescription,
      ).toHaveBeenCalled();
      expect(mockMerchantRulesRepository.upsert).toHaveBeenCalled();
    });

    it('returns updatedCount with the number of affected transactions', async () => {
      mockTransactionsRepository.updateManyByUserAndDescription.mockResolvedValue(
        15,
      );

      const result = await service.bulkCategorize(userId, dto);

      expect(result).toEqual({ updatedCount: 15 });
    });

    it('propagates errors when the merchant rule upsert fails', async () => {
      mockMerchantRulesRepository.upsert.mockRejectedValue(new Error('boom'));

      await expect(service.bulkCategorize(userId, dto)).rejects.toThrow('boom');
    });

    it('treats missing subcategory as null', async () => {
      await service.bulkCategorize(userId, {
        description: 'UBER',
        category: 'Transporte',
      });

      expect(
        mockTransactionsRepository.updateManyByUserAndDescription,
      ).toHaveBeenCalledWith(
        userId,
        'UBER',
        { category: 'Transporte', subcategory: null },
        expect.anything(),
      );
      expect(mockMerchantRulesRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ subcategory: null }),
        expect.anything(),
      );
    });
  });
});
