import { Injectable } from '@nestjs/common';
import {
  CATEGORIES,
  CONFIDENCE_THRESHOLD,
  FALLBACK_CATEGORY,
  MERCHANT_RULE_MIN_CONFIDENCE,
  VALID_CATEGORIES,
} from './categories';
import { MerchantRuleRepository } from './merchant-rule.repository';

export interface ClassificationResult {
  category: string;
  subcategory: string | null;
  confidence: number;
  needsReview: boolean;
}

@Injectable()
export class CategorizationService {
  constructor(
    private readonly merchantRuleRepository: MerchantRuleRepository,
  ) {}

  async classify(
    description: string,
    claudeCategory: string | null,
    claudeSubcategory: string | null,
    claudeConfidence: number,
  ): Promise<ClassificationResult> {
    const rule = await this.merchantRuleRepository.findByPattern(description);
    if (rule && rule.confidence >= MERCHANT_RULE_MIN_CONFIDENCE) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        confidence: rule.confidence,
        needsReview: false,
      };
    }

    return this.applyThreshold(
      claudeCategory,
      claudeSubcategory,
      claudeConfidence,
    );
  }

  async classifyMany(
    transactions: Array<{
      description: string;
      category: string;
      subcategory: string | null;
      confidence: number;
    }>,
  ): Promise<ClassificationResult[]> {
    if (transactions.length === 0) return [];

    const rules = await this.merchantRuleRepository.findByPatterns(
      transactions.map((t) => t.description),
    );
    const ruleMap = new Map(rules.map((r) => [r.pattern, r]));

    return transactions.map((t) => {
      const rule = ruleMap.get(t.description);
      if (rule && rule.confidence >= MERCHANT_RULE_MIN_CONFIDENCE) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: rule.confidence,
          needsReview: false,
        };
      }
      return this.applyThreshold(t.category, t.subcategory, t.confidence);
    });
  }

  private applyThreshold(
    category: string | null,
    subcategory: string | null,
    confidence: number,
  ): ClassificationResult {
    if (
      !category ||
      !VALID_CATEGORIES.has(category) ||
      confidence < CONFIDENCE_THRESHOLD
    ) {
      return {
        category: FALLBACK_CATEGORY,
        subcategory: null,
        confidence,
        needsReview: true,
      };
    }

    if (category === FALLBACK_CATEGORY) {
      return {
        category: FALLBACK_CATEGORY,
        subcategory: null,
        confidence,
        needsReview: true,
      };
    }

    const validSubcategories = CATEGORIES[category];
    const validSubcategory =
      subcategory && validSubcategories.includes(subcategory)
        ? subcategory
        : null;
    const needsReview = validSubcategory === null && subcategory !== null;

    return { category, subcategory: validSubcategory, confidence, needsReview };
  }
}
