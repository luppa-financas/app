import { Test, TestingModule } from '@nestjs/testing';
import { MerchantRuleRepository } from './merchant-rule.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  merchantRule: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
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
      };
      mockPrisma.merchantRule.findFirst.mockResolvedValue(rule);

      const result = await repository.findByPattern('IFOOD');

      expect(mockPrisma.merchantRule.findFirst).toHaveBeenCalledWith({
        where: { pattern: 'IFOOD' },
      });
      expect(result).toBe(rule);
    });

    it('should return null when not found', async () => {
      mockPrisma.merchantRule.findFirst.mockResolvedValue(null);

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
});
