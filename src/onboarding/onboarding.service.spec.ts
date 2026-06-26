import { OnboardingService } from './onboarding.service';
import { ClientsService } from '../clients/clients.service';

describe('OnboardingService', () => {
  it('creates onboarding clients with an invite link instead of a public password', async () => {
    const createWithPortalInvite = jest.fn().mockResolvedValue({ id: 'client-1' });
    const service = new OnboardingService({ createWithPortalInvite } as unknown as ClientsService);

    await service.submit({
      businessName: 'Sample Co',
      contactPerson: 'Client Contact',
      email: 'CLIENT@EXAMPLE.COM',
    });

    expect(createWithPortalInvite).toHaveBeenCalledWith(
      {
        businessName: 'Sample Co',
        contactPerson: 'Client Contact',
        email: 'client@example.com',
        status: 'ONBOARDING',
      },
      undefined,
    );
  });
});
