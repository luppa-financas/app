import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AUTH_CLIENT } from './auth.constants';

export interface ClerkClient {
  verifyToken(
    token: string,
    options?: { authorizedParties?: string[] },
  ): Promise<{ sub: string }>;
}

interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: { userId: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly authorizedParties: string[];

  constructor(
    @Inject(AUTH_CLIENT) private readonly clerkClient: ClerkClient,
    private readonly reflector: Reflector,
    config: ConfigService,
  ) {
    this.authorizedParties = config
      .getOrThrow<string>('CLERK_AUTHORIZED_PARTIES')
      .split(',');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException('Missing authorization token');

    try {
      const payload = await this.clerkClient.verifyToken(token, {
        authorizedParties: this.authorizedParties,
      });
      request.user = { userId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authorization token');
    }
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
