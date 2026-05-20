import { Body, Controller, Param, Put } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.update(id, userId, dto);
  }
}
