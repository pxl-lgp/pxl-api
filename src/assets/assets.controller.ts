import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { AssetsService } from './assets.service';
import { AssetQueryDto } from './dto/asset-query.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEAM')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an asset record' })
  @ApiCreatedResponse({ description: 'Asset created.', type: AssetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can create assets.' })
  @ApiNotFoundResponse({ description: 'Client or content item not found.' })
  create(@Body() input: CreateAssetDto): Promise<AssetResponseDto> {
    return this.assetsService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'List assets, optionally filtered by client, content item, type, or name search' })
  @ApiOkResponse({ description: 'Assets.', type: AssetResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can list assets.' })
  findAll(@Query() query: AssetQueryDto): Promise<AssetResponseDto[]> {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by id' })
  @ApiOkResponse({ description: 'Asset.', type: AssetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can view assets.' })
  @ApiNotFoundResponse({ description: 'Asset not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AssetResponseDto> {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset details' })
  @ApiOkResponse({ description: 'Asset updated.', type: AssetResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  @ApiForbiddenResponse({ description: 'Only admins and team members can update assets.' })
  @ApiNotFoundResponse({ description: 'Asset, client, or content item not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.update(id, input);
  }
}
