import { PartialType } from '@nestjs/swagger';
import { CreateContentPillarDto } from './create-content-pillar.dto';

export class UpdateContentPillarDto extends PartialType(CreateContentPillarDto) {}
