import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ContentModule } from '../content/content.module';
import { AutomationModule } from './automation.module';
import { AutomationRetryController } from './automation-retry.controller';
import { AutomationRetryService } from './automation-retry.service';

@Module({
  imports: [AutomationModule, ClientsModule, ContentModule],
  controllers: [AutomationRetryController],
  providers: [AutomationRetryService],
})
export class AutomationRetryModule {}
