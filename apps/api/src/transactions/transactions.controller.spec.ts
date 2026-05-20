import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

const mockTransactionsService = {
  update: jest.fn(),
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

  describe('PUT /transactions/:id', () => {
    const userId = 'user-1';
    const transactionId = 'tx-1';
    const dto = { alias: 'Uber Eats', category: 'Alimentação', subcategory: 'Delivery' };
    const updatedTransaction = { id: transactionId, ...dto, needsReview: false };

    it('returns 200 with the updated transaction', async () => {
      mockTransactionsService.update.mockResolvedValue(updatedTransaction);

      const result = await controller.update(transactionId, userId, dto);

      expect(result).toEqual(updatedTransaction);
      expect(mockTransactionsService.update).toHaveBeenCalledWith(transactionId, userId, dto);
    });

    it('propagates NotFoundException when transaction belongs to another user', async () => {
      mockTransactionsService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update(transactionId, userId, dto)).rejects.toThrow(NotFoundException);
    });
  });
});
