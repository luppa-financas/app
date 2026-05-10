import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ExtractionService } from './extraction.service';
import { ANTHROPIC_CLIENT } from './extraction.constants';

@Module({
  providers: [
    {
      provide: ANTHROPIC_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Anthropic({ apiKey: config.getOrThrow<string>('ANTHROPIC_API_KEY') }),
    },
    ExtractionService,
  ],
  exports: [ExtractionService],
})
export class ExtractionModule {}
