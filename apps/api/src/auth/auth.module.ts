import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { AUTH_CLIENT } from './auth.constants';

@Module({
  providers: [
    {
      provide: AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClerkClient({ secretKey: config.getOrThrow('CLERK_SECRET_KEY') }),
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
