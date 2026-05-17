import { Test, TestingModule } from '@nestjs/testing';
import { MerchantRuleRepository } from './merchant-rule.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  merchantRule: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('MerchantRuleRepository', () => {
  let repository: MerchantRuleRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantRuleRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<MerchantRuleRepository>(MerchantRuleRepository);
    jest.resetAllMocks();
  });

  describe('findByPattern', () => {
    it('should return the rule when found', async () => {
      const rule = {
        pattern: 'IFOOD',
        category: 'Alimentação',
        subcategory: 'Delivery',
        confidence: 0.95,
        voteCount: 3,
      };
      mockPrisma.merchantRule.findUnique.mockResolvedValue(rule);

      const result = await repository.findByPattern('IFOOD');

      expect(mockPrisma.merchantRule.findUnique).toHaveBeenCalledWith({
        where: { pattern: 'IFOOD' },
      });
      expect(result).toBe(rule);
    });

    it('should return null when not found', async () => {
      mockPrisma.merchantRule.findUnique.mockResolvedValue(null);

      const result = await repository.findByPattern('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('findByPatterns', () => {
    it('should return rules matching the given patterns', async () => {
      const rules = [
        {
          pattern: 'IFOOD',
          category: 'Alimentação',
          subcategory: 'Delivery',
          confidence: 0.95,
          voteCount: 1,
        },
      ];
      mockPrisma.merchantRule.findMany.mockResolvedValue(rules);

      const result = await repository.findByPatterns(['IFOOD', 'UBER']);

      expect(mockPrisma.merchantRule.findMany).toHaveBeenCalledWith({
        where: { pattern: { in: ['IFOOD', 'UBER'] } },
      });
      expect(result).toBe(rules);
    });

    it('should return empty array without querying when patterns list is empty', async () => {
      const result = await repository.findByPatterns([]);

      expect(mockPrisma.merchantRule.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('should create a new rule when pattern does not exist', async () => {
      await repository.upsert('IFOOD', 'Alimentação', 'Delivery');

      expect(mockPrisma.merchantRule.upsert).toHaveBeenCalledWith({
        where: { pattern: 'IFOOD' },
        create: {
          pattern: 'IFOOD',
          category: 'Alimentação',
          subcategory: 'Delivery',
          confidence: 1,
          voteCount: 1,
        },
        update: {
          category: 'Alimentação',
          subcategory: 'Delivery',
          voteCount: { increment: 1 },
          confidence: 1,
        },
      });
    });

    it('should update existing rule incrementing voteCount', async () => {
      await repository.upsert('UBER', 'Transporte', 'Uber / 99 / Taxi');

      expect(mockPrisma.merchantRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pattern: 'UBER' },
          update: expect.objectContaining({
            voteCount: { increment: 1 },
          }) as object,
        }) as object,
      );
    });
  });
});
