import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export class ExecuteStepDto {
  @IsUUID()
  stepExecutionId: string;

  @IsOptional()
  @IsString()
  action?: string; // aprovar, rejeitar, etc

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  metadata?: any; // JSON com dados do formulário da etapa
}