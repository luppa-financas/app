import { Injectable } from '@nestjs/common';
import { MerchantRule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPattern(pattern: string): Promise<MerchantRule | null> {
    return this.prisma.merchantRule.findUnique({ where: { pattern } });
  }

  async findByPatterns(patterns: string[]): Promise<MerchantRule[]> {
    if (patterns.length === 0) return [];
    return this.prisma.merchantRule.findMany({
      where: { pattern: { in: patterns } },
    });
  }

  async upsert(
    pattern: string,
    category: string,
    subcategory: string | null,
  ): Promise<void> {
    await this.prisma.merchantRule.upsert({
      where: { pattern },
      create: { pattern, category, subcategory, confidence: 1, voteCount: 1 },
      update: {
        category,
        subcategory,
        voteCount: { increment: 1 },
        confidence: 1,
      },
    });
  }
}
