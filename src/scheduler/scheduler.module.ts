import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { ContentModule } from '../content/content.module';
import { DatabaseModule } from '../database/database.module';
import { ContentPublisherService } from './content-publisher.service';

@Module({
  imports: [DatabaseModule, ContentModule, AutomationModule],
  providers: [ContentPublisherService],
})
export class SchedulerModule {}
