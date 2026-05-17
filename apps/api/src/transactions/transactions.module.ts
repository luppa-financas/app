import { Module } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsListener } from './transactions.listener';
import { ExtractionModule } from '../extraction/extraction.module';
import { StorageModule } from '../storage/storage.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [ExtractionModule, StorageModule, InvoicesModule],
  providers: [TransactionsRepository, TransactionsListener],
})
export class TransactionsModule {}
