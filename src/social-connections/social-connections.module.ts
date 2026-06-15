import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MetaOauthCallbackController } from './meta-oauth-callback.controller';
import { SocialConnectionsController } from './social-connections.controller';
import { SocialConnectionsService } from './social-connections.service';
import { TokenEncryptionService } from './token-encryption.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialConnectionsController, MetaOauthCallbackController],
  providers: [SocialConnectionsService, TokenEncryptionService],
  exports: [SocialConnectionsService, TokenEncryptionService],
})
export class SocialConnectionsModule {}
