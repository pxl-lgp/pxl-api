import { Injectable } from '@nestjs/common';
import { ClientResponseDto } from '../clients/dto/client-response.dto';
import { ClientsService } from '../clients/clients.service';
import { PublicOnboardingDto } from './dto/public-onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly clientsService: ClientsService) {}

  submit(input: PublicOnboardingDto): Promise<ClientResponseDto> {
    return this.clientsService.createWithPortalInvite(
      {
        ...input,
        email: input.email.toLowerCase(),
        status: 'ONBOARDING',
      },
      undefined,
    );
  }
}
