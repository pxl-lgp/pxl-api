import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PageVisitsController } from './page-visits.controller';
import { PageVisitsService } from './page-visits.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PageVisitsController],
  providers: [PageVisitsService],
})
export class PageVisitsModule {}
