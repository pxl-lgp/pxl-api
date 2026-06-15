import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a client performance report' })
  @ApiCreatedResponse({ description: 'Report created.', type: ReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create reports.' })
  @ApiNotFoundResponse({ description: 'Client not found.' })
  create(@Body() input: CreateReportDto): Promise<ReportResponseDto> {
    return this.reportsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List reports' })
  @ApiOkResponse({ description: 'Reports.', type: ReportResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list reports.' })
  findAll(): Promise<ReportResponseDto[]> {
    return this.reportsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by id' })
  @ApiOkResponse({ description: 'Report.', type: ReportResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view reports.' })
  @ApiNotFoundResponse({ description: 'Report not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ReportResponseDto> {
    return this.reportsService.findOne(id);
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
  ): Promise<ReportResponseDto> {
    return this.reportsService.update(id, input);
  }
}
