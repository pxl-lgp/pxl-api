import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FeatureAccessModule } from '../feature-access/feature-access.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [DatabaseModule, FeatureAccessModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
