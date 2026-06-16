import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { ContentModule } from '../content/content.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocialConnectionsModule } from '../social-connections/social-connections.module';
import { ContentPublisherService } from './content-publisher.service';
import { MetaInsightsIngestionService } from './meta-insights-ingestion.service';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    DatabaseModule,
    ContentModule,
    AutomationModule,
    NotificationsModule,
    SocialConnectionsModule,
  ],
  providers: [ContentPublisherService, RemindersService, MetaInsightsIngestionService],
})
export class SchedulerModule {}
