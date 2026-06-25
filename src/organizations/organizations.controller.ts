import {
  BadRequestException,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsString, Matches, MinLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureAccessService } from '../feature-access/feature-access.service';
import { isFeatureKey } from '../feature-access/features';
import { OrganizationsService } from './organizations.service';

class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;
}

class UpdateOrganizationFeatureDto {
  @IsBoolean()
  enabled!: boolean;
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({ description: 'Organization created.' })
  create(@Body() input: CreateOrganizationDto) {
    return this.organizationsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  @ApiOkResponse({ description: 'Organization list.' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id/features')
  @ApiOperation({ summary: 'List organization feature access' })
  @ApiOkResponse({ description: 'Organization feature access.' })
  findFeatures(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureAccessService.listForOrganization(id);
  }

  @Patch(':id/features/:featureKey')
  @ApiOperation({ summary: 'Toggle organization feature access' })
  @ApiOkResponse({ description: 'Feature access updated.' })
  updateFeature(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('featureKey') featureKey: string,
    @Body() input: UpdateOrganizationFeatureDto,
  ) {
    if (!isFeatureKey(featureKey)) {
      throw new BadRequestException('Unknown feature key.');
    }

    return this.featureAccessService.setFeature(id, featureKey, input.enabled);
  }
}
