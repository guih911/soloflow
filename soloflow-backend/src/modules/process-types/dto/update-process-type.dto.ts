import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProcessTypeDto } from './create-process-type.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProcessTypeDto extends PartialType(
  OmitType(CreateProcessTypeDto, ['steps'] as const)
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
}