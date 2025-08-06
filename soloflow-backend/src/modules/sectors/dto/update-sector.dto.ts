import { PartialType } from '@nestjs/mapped-types';
import { CreateSectorDto } from './create-sector.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSectorDto extends PartialType(CreateSectorDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}