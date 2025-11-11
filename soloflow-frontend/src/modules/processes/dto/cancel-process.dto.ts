import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelProcessDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

