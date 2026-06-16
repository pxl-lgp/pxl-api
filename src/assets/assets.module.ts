import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DatabaseModule } from '../database/database.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [AiModule, DatabaseModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
