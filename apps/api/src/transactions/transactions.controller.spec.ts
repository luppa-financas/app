import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

const mockTransactionsService = {
  update: jest.fn(),
  countByDescription: jest.fn(),
  bulkCategorize: jest.fn(),
  findMany: jest.fn(),
};

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    controller = module.get(TransactionsController);
    jest.clearAllMocks();
  });

  describe('GET /transactions', () => {
    const userId = 'user-1';

    it('calls service.findMany with all query params', async () => {
      mockTransactionsService.findMany.mockResolvedValue({ data: [], total: 0 });

      await controller.findMany(userId, '2026-05', 'itau', 'Alimentação', 'Delivery', 'uber', 2, 10);

      expect(mockTransactionsService.findMany).toHaveBeenCalledWith(userId, {
        month: '2026-05',
        bank: 'itau',
        category: 'Alimentação',
        subcategory: 'Delivery',
        q: 'uber',
        page: 2,
        limit: 10,
      });
    });

    it('returns { data, total, page, limit }', async () => {
      const rows = [{ id: 'tx-1' }];
      mockTransactionsService.findMany.mockResolvedValue({ data: rows, total: 1 });

      const result = await controller.findMany(userId, undefined, undefined, undefined, undefined, undefined, 1, 20);

      expect(result).toEqual({ data: rows, total: 1, page: 1, limit: 20 });
    });

    it('defaults page=1 and limit=20 when not provided', async () => {
      mockTransactionsService.findMany.mockResolvedValue({ data: [], total: 0 });

      await controller.findMany(userId);

      expect(mockTransactionsService.findMany).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  describe('PUT /transactions/:id', () => {
    const userId = 'user-1';
    const transactionId = 'tx-1';
    const dto = {
      alias: 'Uber Eats',
      category: 'Alimentação',
      subcategory: 'Delivery',
    };
    const updatedTransaction = {
      id: transactionId,
      ...dto,
      needsReview: false,
    };

    it('returns 200 with the updated transaction', async () => {
      mockTransactionsService.update.mockResolvedValue(updatedTransaction);

      const result = await controller.update(transactionId, userId, dto);

      expect(result).toEqual(updatedTransaction);
      expect(mockTransactionsService.update).toHaveBeenCalledWith(
        transactionId,
        userId,
        dto,
      );
    });

    it('propagates NotFoundException when transaction belongs to another user', async () => {
      mockTransactionsService.update.mockRejectedValue(new NotFoundException());

      await expect(
        controller.update(transactionId, userId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /transactions/count', () => {
    const userId = 'user-1';

    it('delegates to service.countByDescription with userId and description', async () => {
      mockTransactionsService.countByDescription.mockResolvedValue(15);

      await controller.count(userId, 'UBER');

      expect(mockTransactionsService.countByDescription).toHaveBeenCalledWith(
        userId,
        'UBER',
      );
    });

    it('returns { count } with the value from the service', async () => {
      mockTransactionsService.countByDescription.mockResolvedValue(15);

      const result = await controller.count(userId, 'UBER');

      expect(result).toEqual({ count: 15 });
    });
  });

  describe('POST /transactions/bulk-categorize', () => {
    const userId = 'user-1';
    const dto = {
      description: 'UBER',
      category: 'Transporte',
      subcategory: 'Uber / 99 / Taxi',
    };

    it('delegates to service.bulkCategorize with userId and dto', async () => {
      mockTransactionsService.bulkCategorize.mockResolvedValue({
        updatedCount: 15,
      });

      await controller.bulkCategorize(userId, dto);

      expect(mockTransactionsService.bulkCategorize).toHaveBeenCalledWith(
        userId,
        dto,
      );
    });

    it('returns { updatedCount } from the service', async () => {
      mockTransactionsService.bulkCategorize.mockResolvedValue({
        updatedCount: 15,
      });

      const result = await controller.bulkCategorize(userId, dto);

      expect(result).toEqual({ updatedCount: 15 });
    });
  });
});
