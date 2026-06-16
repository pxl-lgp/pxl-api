import { forwardRef, Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { DatabaseModule } from '../database/database.module';
import { DriveModule } from '../drive/drive.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OnboardingTasksModule } from '../onboarding-tasks/onboarding-tasks.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [
    DatabaseModule,
    AutomationModule,
    forwardRef(() => DriveModule),
    NotificationsModule,
    OnboardingTasksModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
