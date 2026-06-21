import { forwardRef, Module } from '@nestjs/common';
import { ClientPortalModule } from '../client-portal/client-portal.module';
import { ClientsModule } from '../clients/clients.module';
import { ClientDriveController } from './client-drive.controller';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';

@Module({
  imports: [forwardRef(() => ClientsModule), ClientPortalModule],
  controllers: [DriveController, ClientDriveController],
  providers: [DriveService],
  exports: [DriveService],
})
export class DriveModule {}
