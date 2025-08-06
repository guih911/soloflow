
import { IsUUID, IsOptional } from 'class-validator';

export class AssignSectorDto {
  @IsOptional()
  @IsUUID()
  sectorId?: string | null;
}