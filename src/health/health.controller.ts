import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check — is the process up' })
  @ApiOkResponse({
    description: 'The API process is running.',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'pxl-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check — is the API able to serve traffic (DB reachable)' })
  @ApiOkResponse({
    description: 'The API and its database are reachable.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({ description: 'The database is not reachable.' })
  async getReadiness(): Promise<HealthResponseDto> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'pxl-api',
        timestamp: new Date().toISOString(),
        database: 'down',
      });
    }

    return {
      status: 'ok',
      service: 'pxl-api',
      timestamp: new Date().toISOString(),
      database: 'up',
    };
  }
}
