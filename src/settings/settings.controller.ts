import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationSettingResponseDto } from './dto/notification-setting-response.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List notification preferences' })
  @ApiOkResponse({ type: NotificationSettingResponseDto, isArray: true })
  findNotificationSettings(): Promise<NotificationSettingResponseDto[]> {
    return this.settingsService.findNotificationSettings();
  }

  @Patch('notifications/:eventKey')
  @ApiOperation({ summary: 'Update a notification preference' })
  @ApiOkResponse({ type: NotificationSettingResponseDto })
  updateNotificationSetting(
    @Param('eventKey') eventKey: string,
    @Body() input: UpdateNotificationSettingDto,
  ): Promise<NotificationSettingResponseDto> {
    return this.settingsService.updateNotificationSetting(eventKey, input);
  }
}
