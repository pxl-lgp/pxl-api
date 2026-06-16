import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ContentPillarsController } from './content-pillars.controller';
import { ContentPillarsService } from './content-pillars.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContentPillarsController],
  providers: [ContentPillarsService],
})
export class ContentPillarsModule {}
