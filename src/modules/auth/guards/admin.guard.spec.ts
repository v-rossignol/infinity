import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  const createContext = (user?: {
    id: string;
    username: string;
    role?: string;
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  it('allows admin users', () => {
    expect(
      guard.canActivate(createContext({ id: 'user-id', username: 'admin', role: 'admin' })),
    ).toBe(true);
  });

  it('denies non-admin users', () => {
    expect(() =>
      guard.canActivate(createContext({ id: 'user-id', username: 'pilot', role: 'user' })),
    ).toThrow(ForbiddenException);
  });

  it('denies requests without a role', () => {
    expect(() => guard.canActivate(createContext({ id: 'user-id', username: 'pilot' }))).toThrow(
      ForbiddenException,
    );
  });
});
