import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { BulkCategorizeDto } from './dto/bulk-categorize.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('count')
  async count(
    @CurrentUser() userId: string,
    @Query('description') description: string,
  ): Promise<{ count: number }> {
    const count = await this.transactionsService.countByDescription(
      userId,
      description,
    );
    return { count };
  }

  @Post('bulk-categorize')
  async bulkCategorize(
    @CurrentUser() userId: string,
    @Body() dto: BulkCategorizeDto,
  ): Promise<{ updatedCount: number }> {
    return this.transactionsService.bulkCategorize(userId, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.update(id, userId, dto);
  }
}
