import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantRuleSource } from '@prisma/client';
import { MerchantRulesRepository } from '../merchant-rules/merchant-rules.repository';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

const mockTransactionsRepository = {
  findByIdAndUserId: jest.fn(),
  update: jest.fn(),
};

const mockMerchantRulesRepository = {
  upsert: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: mockTransactionsRepository },
        { provide: MerchantRulesRepository, useValue: mockMerchantRulesRepository },
      ],
    }).compile();

    service = module.get(TransactionsService);
    jest.clearAllMocks();
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
      mockTransactionsRepository.findByIdAndUserId.mockResolvedValue(existingTransaction);
      mockTransactionsRepository.update.mockResolvedValue({ ...existingTransaction, ...dto, needsReview: false });
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

      await expect(service.update(transactionId, userId, dto)).rejects.toThrow(NotFoundException);
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
      const secondDto: UpdateTransactionDto = { category: 'Transporte', subcategory: null };
      mockTransactionsRepository.update.mockResolvedValue({ ...existingTransaction, ...secondDto, needsReview: false });

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
});
