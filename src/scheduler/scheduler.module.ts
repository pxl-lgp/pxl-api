import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { AutomationRetryModule } from '../automation/automation-retry.module';
import { ContentModule } from '../content/content.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocialConnectionsModule } from '../social-connections/social-connections.module';
import { ContentPublisherService } from './content-publisher.service';
import { MetaInsightsIngestionService } from './meta-insights-ingestion.service';
import { RemindersService } from './reminders.service';
import { AutomationRetrySchedulerService } from './automation-retry-scheduler.service';

@Module({
  imports: [
    DatabaseModule,
    ContentModule,
    AutomationModule,
    AutomationRetryModule,
    NotificationsModule,
    SocialConnectionsModule,
  ],
  providers: [
    ContentPublisherService,
    RemindersService,
    MetaInsightsIngestionService,
    AutomationRetrySchedulerService,
  ],
})
export class SchedulerModule {}
