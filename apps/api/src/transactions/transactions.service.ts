import { Injectable, NotFoundException } from '@nestjs/common';
import { MerchantRuleSource, Transaction } from '@prisma/client';
import { MerchantRulesRepository } from '../merchant-rules/merchant-rules.repository';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsRepository } from './transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly merchantRulesRepository: MerchantRulesRepository,
  ) {}

  async update(id: string, userId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findByIdAndUserId(id, userId);
    if (!transaction) throw new NotFoundException(`Transaction ${id} not found`);

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
}
