import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePageVisitDto } from './dto/create-page-visit.dto';
import { PageVisitSummaryDto } from './dto/page-visit-summary.dto';
import { PageVisitsService } from './page-visits.service';

@ApiTags('page-visits')
@Controller('page-visits')
export class PageVisitsController {
  constructor(private readonly pageVisitsService: PageVisitsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a public page visit' })
  @ApiCreatedResponse({ description: 'Page visit recorded.' })
  async create(
    @Body() input: CreatePageVisitDto,
    @Headers('referer') referrer?: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<void> {
    await this.pageVisitsService.create(input, { referrer, userAgent });
  }

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEAM')
  @ApiOperation({ summary: 'Get page visit totals' })
  @ApiQuery({ name: 'path', required: false })
  @ApiOkResponse({ description: 'Page visit summary.', type: PageVisitSummaryDto })
  getSummary(@Query('path') path = '/'): Promise<PageVisitSummaryDto> {
    return this.pageVisitsService.getSummary(path);
  }
}
