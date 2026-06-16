import { PartialType } from '@nestjs/swagger';
import { CreateContentTemplateDto } from './create-content-template.dto';

export class UpdateContentTemplateDto extends PartialType(CreateContentTemplateDto) {}
