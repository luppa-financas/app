import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { BulkCategorizeDto } from './dto/bulk-categorize.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findMany(
    @CurrentUser() userId: string,
    @Query('month') month?: string,
    @Query('bank') bank?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const resolvedPage = page ?? 1;
    const resolvedLimit = limit ?? 20;
    const { data, total } = await this.transactionsService.findMany(userId, {
      month,
      bank,
      category,
      subcategory,
      q,
      page: resolvedPage,
      limit: resolvedLimit,
    });
    return { data, total, page: resolvedPage, limit: resolvedLimit };
  }

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
