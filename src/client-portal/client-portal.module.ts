import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { DatabaseModule } from '../database/database.module';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';

@Module({
  imports: [DatabaseModule, ApprovalsModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
