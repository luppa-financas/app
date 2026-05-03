import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

function getDecoratorFactory(decorator: typeof CurrentUser) {
  class TestController {
    handler(@decorator() _userId: string) {}
  }

  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handler') as Record<string, { factory: (data: unknown, ctx: ExecutionContext) => string }>;
  const [entry] = Object.values(args);
  return entry.factory;
}

function buildContext(user?: { userId: string }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator', () => {
  const factory = getDecoratorFactory(CurrentUser);

  it('returns userId from request.user', () => {
    const ctx = buildContext({ userId: 'user_123' });

    const result = factory(undefined, ctx);

    expect(result).toBe('user_123');
  });

  it('throws when request.user is not set', () => {
    const ctx = buildContext(undefined);

    expect(() => factory(undefined, ctx)).toThrow();
  });
});
