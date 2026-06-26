import { ForbiddenException } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalService.getClientForUser', () => {
  function buildService(limitResults: unknown[][]) {
    const limit = jest
      .fn()
      .mockResolvedValueOnce(limitResults[0] ?? [])
      .mockResolvedValueOnce(limitResults[1] ?? []);
    const db = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit,
    };

    return new ClientPortalService(db as never, {} as never);
  }

  it('rejects non-client users', async () => {
    const service = buildService([]);

    await expect(
      service.getClientForUser({
        id: 'user-1',
        organizationId: 'org-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the explicitly linked client before falling back to email', async () => {
    const linkedClient = { id: 'client-1', userId: 'user-1' };
    const service = buildService([[linkedClient]]);

    const result = await service.getClientForUser({
      id: 'user-1',
      organizationId: 'org-1',
      email: 'client@example.com',
      name: 'Client',
      role: 'CLIENT',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result).toBe(linkedClient);
  });
});
