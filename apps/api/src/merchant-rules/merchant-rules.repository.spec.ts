import { Test, TestingModule } from '@nestjs/testing';
import { MerchantRuleSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantRulesRepository } from './merchant-rules.repository';

const mockPrisma = {
  merchantRule: {
    upsert: jest.fn(),
  },
};

describe('MerchantRulesRepository', () => {
  let repository: MerchantRulesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantRulesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(MerchantRulesRepository);
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    const input = {
      userId: 'user-1',
      pattern: 'UBER EATS',
      category: 'Alimentação',
      subcategory: 'Delivery',
      confidence: 1.0,
      source: MerchantRuleSource.USER_CORRECTION,
    };

    it('creates a new rule when none exists for (userId, pattern)', async () => {
      mockPrisma.merchantRule.upsert.mockResolvedValue({ id: 'rule-1', ...input });

      await repository.upsert(input);

      expect(mockPrisma.merchantRule.upsert).toHaveBeenCalledWith({
        where: { userId_pattern: { userId: input.userId, pattern: input.pattern } },
        create: expect.objectContaining({
          userId: input.userId,
          pattern: input.pattern,
          category: input.category,
          subcategory: input.subcategory,
          confidence: input.confidence,
          source: input.source,
        }),
        update: expect.objectContaining({
          category: input.category,
          subcategory: input.subcategory,
          confidence: input.confidence,
          source: input.source,
        }),
      });
    });

    it('updates category, subcategory, confidence and source when rule already exists', async () => {
      const updated = { ...input, category: 'Transporte', subcategory: null };
      mockPrisma.merchantRule.upsert.mockResolvedValue({ id: 'rule-1', ...updated });

      await repository.upsert(updated);

      expect(mockPrisma.merchantRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            category: 'Transporte',
            subcategory: null,
          }),
        }),
      );
    });
  });
});
