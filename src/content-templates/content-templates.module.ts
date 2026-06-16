import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ContentTemplatesController } from './content-templates.controller';
import { ContentTemplatesService } from './content-templates.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContentTemplatesController],
  providers: [ContentTemplatesService],
})
export class ContentTemplatesModule {}
