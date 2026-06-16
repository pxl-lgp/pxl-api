import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OnboardingTasksController } from './onboarding-tasks.controller';
import { OnboardingTasksService } from './onboarding-tasks.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OnboardingTasksController],
  providers: [OnboardingTasksService],
  exports: [OnboardingTasksService],
})
export class OnboardingTasksModule {}
