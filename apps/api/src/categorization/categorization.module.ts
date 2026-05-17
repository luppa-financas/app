import { Module } from '@nestjs/common';
import { CategorizationService } from './categorization.service';
import { MerchantRuleRepository } from './merchant-rule.repository';

@Module({
  providers: [CategorizationService, MerchantRuleRepository],
  exports: [CategorizationService],
})
export class CategorizationModule {}
