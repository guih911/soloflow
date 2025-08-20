import { IsString, IsOptional, IsUUID } from 'class-validator';

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
  metadata?: any; // JSON com dados do formulário da etapa
}