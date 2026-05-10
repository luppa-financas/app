import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { AUTH_CLIENT } from './auth.constants';

@Module({
  providers: [
    {
      provide: AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secretKey = config.getOrThrow<string>('CLERK_SECRET_KEY');
        return {
          verifyToken: (token: string, options?: { authorizedParties?: string[] }) =>
            verifyToken(token, { secretKey, ...options }),
        };
      },
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
