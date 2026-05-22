import { Injectable } from '@nestjs/common';
import { MerchantRuleSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MerchantRuleUpsertData {
  userId: string;
  pattern: string;
  category: string;
  subcategory: string | null | undefined;
  confidence: number;
  source: MerchantRuleSource;
}

@Injectable()
export class MerchantRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    data: MerchantRuleUpsertData,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const fields = {
      category: data.category,
      subcategory: data.subcategory ?? null,
      confidence: data.confidence,
      source: data.source,
    };
    const client = tx ?? this.prisma;

    await client.merchantRule.upsert({
      where: { userId_pattern: { userId: data.userId, pattern: data.pattern } },
      create: { userId: data.userId, pattern: data.pattern, ...fields },
      update: fields,
    });
  }
}
