import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { CalendarModule } from '../calendar/calendar.module';
import { DatabaseModule } from '../database/database.module';
import { SocialConnectionsModule } from '../social-connections/social-connections.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { MetaPublishingService } from './meta-publishing.service';

@Module({
  imports: [
    AutomationModule,
    CalendarModule,
    DatabaseModule,
    SocialConnectionsModule,
    WorkspaceModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, MetaPublishingService],
  exports: [ContentService],
})
export class ContentModule {}
