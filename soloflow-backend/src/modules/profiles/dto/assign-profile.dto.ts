import { IsOptional, IsString } from 'class-validator';

export class AssignProfileDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  assignedBy?: string;
}
