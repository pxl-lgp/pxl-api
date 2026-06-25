import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FeatureAccessModule } from '../feature-access/feature-access.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [DatabaseModule, FeatureAccessModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
