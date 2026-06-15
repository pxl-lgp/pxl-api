import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { DatabaseModule } from '../database/database.module';
import { SocialConnectionsModule } from '../social-connections/social-connections.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { MetaPublishingService } from './meta-publishing.service';

@Module({
  imports: [AutomationModule, DatabaseModule, SocialConnectionsModule],
  controllers: [ContentController],
  providers: [ContentService, MetaPublishingService],
  exports: [ContentService],
})
export class ContentModule {}
