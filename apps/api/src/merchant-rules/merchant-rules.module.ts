import { Module } from '@nestjs/common';
import { MerchantRulesRepository } from './merchant-rules.repository';

@Module({
  providers: [MerchantRulesRepository],
  exports: [MerchantRulesRepository],
})
export class MerchantRulesModule {}
