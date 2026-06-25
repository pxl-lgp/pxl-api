import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, WorkspaceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
