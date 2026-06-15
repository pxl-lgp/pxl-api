import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { ContentModule } from '../content/content.module';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentPublisherService } from './content-publisher.service';
import { RemindersService } from './reminders.service';

@Module({
  imports: [DatabaseModule, ContentModule, AutomationModule, NotificationsModule],
  providers: [ContentPublisherService, RemindersService],
})
export class SchedulerModule {}
