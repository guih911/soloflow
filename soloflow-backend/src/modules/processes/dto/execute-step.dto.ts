import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class ExecuteStepDto {
  @IsUUID()
  stepExecutionId: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  metadata?: any; // JSON com dados do formulário da etapa
}