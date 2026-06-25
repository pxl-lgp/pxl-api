import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FeatureAccessGuard } from './feature-access.guard';
import { FeatureAccessService } from './feature-access.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [FeatureAccessGuard, FeatureAccessService],
  exports: [FeatureAccessGuard, FeatureAccessService],
})
export class FeatureAccessModule {}
