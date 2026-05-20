import { Module } from '@nestjs/common';
import { MerchantRulesModule } from '../merchant-rules/merchant-rules.module';
import { ExtractionModule } from '../extraction/extraction.module';
import { StorageModule } from '../storage/storage.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { CategorizationModule } from '../categorization/categorization.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsListener } from './transactions.listener';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    ExtractionModule,
    StorageModule,
    InvoicesModule,
    CategorizationModule,
    MerchantRulesModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsRepository,
    TransactionsListener,
    TransactionsService,
  ],
})
export class TransactionsModule {}
