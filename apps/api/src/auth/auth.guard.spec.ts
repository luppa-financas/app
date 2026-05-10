import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

const mockVerifyToken = jest.fn();
const mockConfigGet = jest.fn().mockReturnValue('http://localhost:3000,https://luppin.app');

const makeCtx = (authHeader?: string): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader }, user: undefined }),
    }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.resetAllMocks();

    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    config = { getOrThrow: mockConfigGet } as unknown as jest.Mocked<ConfigService>;
    mockConfigGet.mockReturnValue('http://localhost:3000,https://luppin.app');

    guard = new AuthGuard({ verifyToken: mockVerifyToken }, reflector, config);
  });

  it('bypasses guard for @Public() routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = await guard.canActivate(makeCtx());

    expect(result).toBe(true);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(makeCtx())).rejects.toThrow(UnauthorizedException);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when token is invalid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    mockVerifyToken.mockRejectedValue(new Error('Token invalid'));

    await expect(guard.canActivate(makeCtx('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when azp is not in authorizedParties', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    mockVerifyToken.mockRejectedValue(new Error('azp is not in authorizedParties'));

    await expect(guard.canActivate(makeCtx('Bearer token-wrong-azp'))).rejects.toThrow(UnauthorizedException);
  });

  it('returns true and sets request.user when token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    mockVerifyToken.mockResolvedValue({ sub: 'user_123' });

    const request = { headers: { authorization: 'Bearer valid-token' }, user: undefined };
    const ctx = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toEqual({ userId: 'user_123' });
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token', {
      authorizedParties: ['http://localhost:3000', 'https://luppin.app'],
    });
  });
});
