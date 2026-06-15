import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { DatabaseModule } from '../database/database.module';
import { ClientsAutomationController } from './clients-automation.controller';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [DatabaseModule, AutomationModule],
  controllers: [ClientsAutomationController, ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
