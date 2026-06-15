import { Body, Controller, Headers, Param, ParseUUIDPipe, Patch, UnauthorizedException } from '@nestjs/common';
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { ClientsService } from './clients.service';
import { ClientResponseDto } from './dto/client-response.dto';
import { UpdateDriveFolderDto } from './dto/update-drive-folder.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientsAutomationController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Patch(':id/drive-folder')
  @ApiOperation({ summary: 'Update client Drive folder URL from automation' })
  @ApiHeader({
    name: 'x-pxl-automation-secret',
    required: true,
    description: 'Shared automation secret from AUTOMATION_WEBHOOK_SECRET.',
  })
  @ApiOkResponse({ description: 'Client Drive folder URL updated.', type: ClientResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid automation secret.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  updateDriveFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateDriveFolderDto,
    @Headers('x-pxl-automation-secret') secret?: string,
  ): Promise<ClientResponseDto> {
    this.assertAutomationSecret(secret);

    return this.clientsService.updateDriveFolder(id, input.driveFolderUrl);
  }

  private assertAutomationSecret(secret?: string): void {
    const expectedSecret = this.config.get('AUTOMATION_WEBHOOK_SECRET', { infer: true });

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid automation secret.');
    }
  }
}
