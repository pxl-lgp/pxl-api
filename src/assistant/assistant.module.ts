import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AssistantController } from './assistant.controller';

@Module({
  imports: [AiModule],
  controllers: [AssistantController],
})
export class AssistantModule {}
