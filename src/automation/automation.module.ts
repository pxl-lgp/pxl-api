import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

@Module({
  imports: [DatabaseModule, WorkspaceModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
