import { Test, TestingModule } from '@nestjs/testing';
import { CategorizationService } from './categorization.service';
import { MerchantRuleRepository } from './merchant-rule.repository';

const mockMerchantRuleRepository = {
  findByPattern: jest.fn(),
  findByPatterns: jest.fn(),
};

describe('CategorizationService', () => {
  let service: CategorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategorizationService,
        {
          provide: MerchantRuleRepository,
          useValue: mockMerchantRuleRepository,
        },
      ],
    }).compile();

    service = module.get<CategorizationService>(CategorizationService);
    jest.resetAllMocks();
  });

  describe('classify', () => {
    it('should return category and subcategory as-is when valid and confidence >= 0.7', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue(null);

      const result = await service.classify(
        'IFOOD*REST X',
        'Alimentação',
        'Delivery',
        0.95,
      );

      expect(result).toEqual({
        category: 'Alimentação',
        subcategory: 'Delivery',
        confidence: 0.95,
        needsReview: false,
      });
    });

    it('should return Outros and needsReview when confidence < 0.7', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue(null);

      const result = await service.classify(
        'PG*ABC123',
        'Alimentação',
        'Restaurante',
        0.5,
      );

      expect(result).toEqual({
        category: 'Outros',
        subcategory: null,
        confidence: 0.5,
        needsReview: true,
      });
    });

    it('should return Outros and needsReview when category is not in the valid list', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue(null);

      const result = await service.classify(
        'LOJA X',
        'Comida',
        'Restaurante',
        0.9,
      );

      expect(result).toEqual({
        category: 'Outros',
        subcategory: null,
        confidence: 0.9,
        needsReview: true,
      });
    });

    it('should keep category but nullify subcategory when subcategory is invalid', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue(null);

      const result = await service.classify('UBER', 'Transporte', 'Avião', 0.8);

      expect(result).toEqual({
        category: 'Transporte',
        subcategory: null,
        confidence: 0.8,
        needsReview: true,
      });
    });

    it('should always set needsReview when category is Outros', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue(null);

      const result = await service.classify(
        'JOAO SILVA ME',
        'Outros',
        null,
        0.8,
      );

      expect(result).toEqual({
        category: 'Outros',
        subcategory: null,
        confidence: 0.8,
        needsReview: true,
      });
    });

    it('should use MerchantRule when found with confidence >= 0.9', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue({
        category: 'Alimentação',
        subcategory: 'Supermercado',
        confidence: 0.95,
      });

      const result = await service.classify(
        'MERCADAO LTDA',
        'Outros',
        null,
        0.3,
      );

      expect(result).toEqual({
        category: 'Alimentação',
        subcategory: 'Supermercado',
        confidence: 0.95,
        needsReview: false,
      });
    });

    it('should ignore MerchantRule when its confidence < 0.9 and use Claude result', async () => {
      mockMerchantRuleRepository.findByPattern.mockResolvedValue({
        category: 'Alimentação',
        subcategory: 'Supermercado',
        confidence: 0.7,
      });

      const result = await service.classify(
        'LOJA X',
        'Compras',
        'Marketplace',
        0.85,
      );

      expect(result).toEqual({
        category: 'Compras',
        subcategory: 'Marketplace',
        confidence: 0.85,
        needsReview: false,
      });
    });
  });

  describe('classifyMany', () => {
    it('should issue a single batch query and classify all transactions', async () => {
      mockMerchantRuleRepository.findByPatterns.mockResolvedValue([
        {
          pattern: 'IFOOD',
          category: 'Alimentação',
          subcategory: 'Delivery',
          confidence: 0.95,
        },
      ]);

      const inputs = [
        {
          description: 'IFOOD',
          category: 'Outros',
          subcategory: null,
          confidence: 0.4,
        },
        {
          description: 'NETFLIX',
          category: 'Assinaturas',
          subcategory: 'Streaming',
          confidence: 0.98,
        },
      ];

      const result = await service.classifyMany(inputs);

      expect(mockMerchantRuleRepository.findByPatterns).toHaveBeenCalledTimes(
        1,
      );
      expect(mockMerchantRuleRepository.findByPatterns).toHaveBeenCalledWith([
        'IFOOD',
        'NETFLIX',
      ]);
      expect(result[0]).toEqual({
        category: 'Alimentação',
        subcategory: 'Delivery',
        confidence: 0.95,
        needsReview: false,
      });
      expect(result[1]).toEqual({
        category: 'Assinaturas',
        subcategory: 'Streaming',
        confidence: 0.98,
        needsReview: false,
      });
    });

    it('should return empty array without querying when input is empty', async () => {
      const result = await service.classifyMany([]);

      expect(mockMerchantRuleRepository.findByPatterns).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
