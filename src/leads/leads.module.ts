import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { DatabaseModule } from '../database/database.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AutomationModule, DatabaseModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
