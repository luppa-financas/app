import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { WebhookVerifier } from './webhook-verifier';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, WebhookVerifier],
})
export class UsersModule {}
