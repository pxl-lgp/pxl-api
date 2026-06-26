import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AutomationModule } from '../automation/automation.module';
import { DatabaseModule } from '../database/database.module';
import { DriveModule } from '../drive/drive.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OnboardingTasksModule } from '../onboarding-tasks/onboarding-tasks.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AutomationModule,
    forwardRef(() => DriveModule),
    NotificationsModule,
    OnboardingTasksModule,
    WorkspaceModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
