import { Module } from '@nestjs/common';
import { UsersController, UserProfileController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { WebhookVerifier } from './webhook-verifier';

@Module({
  controllers: [UsersController, UserProfileController],
  providers: [UsersService, UsersRepository, WebhookVerifier],
})
export class UsersModule {}
