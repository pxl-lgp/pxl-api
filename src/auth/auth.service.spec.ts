import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';
import { PublicUser, UsersService } from '../users/users.service';

describe('AuthService.login', () => {
  const buildService = (
    overrides: {
      findByEmail?: jest.Mock;
      signAsync?: jest.Mock;
    } = {},
  ) => {
    const usersService = {
      findByEmail: overrides.findByEmail ?? jest.fn(),
      toPublicUser: jest.fn(
        (user: { id: string; email: string; name: string; role: string; status: string }) =>
          ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as PublicUser,
      ),
    } as unknown as UsersService;
    const jwtService = {
      signAsync: overrides.signAsync ?? jest.fn().mockResolvedValue('signed.jwt.token'),
    };
    const config = { get: jest.fn().mockReturnValue('http://localhost:3000') };
    const notificationsService = { notifyUser: jest.fn() };
    const auditService = { log: jest.fn() };
    const db = {};

    return new AuthService(
      jwtService as never,
      usersService,
      config as never,
      notificationsService as never,
      auditService as never,
      db as never,
    );
  };

  it('returns an access token and public user on valid credentials', async () => {
    const passwordHash = await hash('correct-password', 12);
    const service = buildService({
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'admin@pxl.test',
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash,
      }),
    });

    const result = await service.login({ email: 'admin@pxl.test', password: 'correct-password' });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toMatchObject({ id: 'user-1', email: 'admin@pxl.test', role: 'ADMIN' });
    expect((result.user as PublicUser & { passwordHash?: string }).passwordHash).toBeUndefined();
  });

  it('rejects an unknown email with a generic error', async () => {
    const service = buildService({ findByEmail: jest.fn().mockResolvedValue(undefined) });

    await expect(
      service.login({ email: 'nobody@pxl.test', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a wrong password with the same generic error', async () => {
    const passwordHash = await hash('correct-password', 12);
    const service = buildService({
      findByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'admin@pxl.test',
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash,
      }),
    });

    await expect(
      service.login({ email: 'admin@pxl.test', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
