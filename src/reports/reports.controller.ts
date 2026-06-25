import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Feature } from '../feature-access/feature.decorator';
import { FeatureAccessGuard } from '../feature-access/feature-access.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Roles('ADMIN', 'TEAM')
@Feature('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a client performance report' })
  @ApiCreatedResponse({ description: 'Report created.', type: ReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create reports.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(
    @Body() input: CreateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportResponseDto> {
    return this.reportsService.create(input, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List reports' })
  @ApiOkResponse({ description: 'Reports.', type: ReportResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list reports.' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ReportResponseDto[]> {
    return this.reportsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by id' })
  @ApiOkResponse({ description: 'Report.', type: ReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view reports.' })
  @ApiNotFoundResponse({ description: 'Report not found.' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportResponseDto> {
    return this.reportsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report details' })
  @ApiOkResponse({ description: 'Report updated.', type: ReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update reports.' })
  @ApiNotFoundResponse({ description: 'Report or client not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportResponseDto> {
    return this.reportsService.update(id, input, user.organizationId);
  }

  @Patch(':id/ready')
  @ApiOperation({ summary: 'Mark a report as ready for delivery' })
  @ApiOkResponse({ description: 'Report marked ready.', type: ReportResponseDto })
  markReady(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportResponseDto> {
    return this.reportsService.markReady(id, user.organizationId);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Send a report to the client' })
  @ApiOkResponse({ description: 'Report sent.', type: ReportResponseDto })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportResponseDto> {
    return this.reportsService.send(id, user.organizationId);
  }
}
