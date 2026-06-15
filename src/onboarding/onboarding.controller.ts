import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClientResponseDto } from '../clients/dto/client-response.dto';
import { PublicOnboardingDto } from './dto/public-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Submit public client onboarding intake' })
  @ApiCreatedResponse({
    description: 'Onboarding client created and client-created automation event emitted.',
    type: ClientResponseDto,
  })
  submit(@Body() input: PublicOnboardingDto): Promise<ClientResponseDto> {
    return this.onboardingService.submit(input);
  }
}
