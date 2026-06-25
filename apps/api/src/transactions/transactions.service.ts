import { Injectable, NotFoundException } from '@nestjs/common';
import { MerchantRuleSource, Transaction } from '@prisma/client';
import { MerchantRulesRepository } from '../merchant-rules/merchant-rules.repository';
import { PrismaService } from '../prisma/prisma.service';
import { BulkCategorizeDto } from './dto/bulk-categorize.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsRepository } from './transactions.repository';

export interface FindManyFilters {
  month?: string;
  bank?: string;
  category?: string;
  subcategory?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly merchantRulesRepository: MerchantRulesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findMany(
    userId: string,
    filters: FindManyFilters,
  ): Promise<{ data: Transaction[]; total: number }> {
    return this.transactionsRepository.findPaginated(userId, {
      ...filters,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!transaction)
      throw new NotFoundException(`Transaction ${id} not found`);

    const [updated] = await Promise.all([
      this.transactionsRepository.update(id, {
        alias: dto.alias,
        category: dto.category,
        subcategory: dto.subcategory ?? null,
        needsReview: false,
      }),
      this.merchantRulesRepository.upsert({
        userId,
        pattern: transaction.description,
        category: dto.category,
        subcategory: dto.subcategory ?? null,
        confidence: 1.0,
        source: MerchantRuleSource.USER_CORRECTION,
      }),
    ]);

    return updated;
  }

  async countByDescription(
    userId: string,
    description: string,
  ): Promise<number> {
    return this.transactionsRepository.countByUserAndDescription(
      userId,
      description,
    );
  }

  async bulkCategorize(
    userId: string,
    dto: BulkCategorizeDto,
  ): Promise<{ updatedCount: number }> {
    const subcategory = dto.subcategory ?? null;
    return this.prisma.$transaction(async (tx) => {
      const updatedCount =
        await this.transactionsRepository.updateManyByUserAndDescription(
          userId,
          dto.description,
          { category: dto.category, subcategory },
          tx,
        );
      await this.merchantRulesRepository.upsert(
        {
          userId,
          pattern: dto.description,
          category: dto.category,
          subcategory,
          confidence: 1.0,
          source: MerchantRuleSource.USER_CORRECTION,
        },
        tx,
      );
      return { updatedCount };
    });
  }
}
