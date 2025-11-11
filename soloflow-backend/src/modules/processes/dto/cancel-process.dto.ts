import { IsOptional, IsString } from 'class-validator';

export class CancelProcessDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
