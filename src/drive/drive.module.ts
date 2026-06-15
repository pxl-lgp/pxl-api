import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { ClientPortalModule } from '../client-portal/client-portal.module';
import { ClientsModule } from '../clients/clients.module';
import { ClientDriveController } from './client-drive.controller';
import { DriveProvisioningListener } from './drive-provisioning.listener';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';

@Module({
  imports: [ClientsModule, ClientPortalModule, AutomationModule],
  controllers: [DriveController, ClientDriveController],
  providers: [DriveService, DriveProvisioningListener],
})
export class DriveModule {}
