import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { SubTaskStatus, SubTaskAssignmentType, SubTaskExecutionMode } from '@prisma/client';

// DTO para criar template de sub-tarefa
export class CreateSubTaskTemplateDto {
  @IsUUID()
  stepVersionId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsNumber()
  order: number;

  @IsOptional()
  @IsEnum(SubTaskExecutionMode)
  executionMode?: SubTaskExecutionMode;

  @IsOptional()
  @IsEnum(SubTaskAssignmentType)
  assignmentType?: SubTaskAssignmentType;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsUUID()
  assignedToSectorId?: string;

  @IsOptional()
  @IsNumber()
  slaHours?: number;

  @IsOptional()
  @IsNumber()
  slaDays?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAttachment?: boolean;
}

// DTO para atualizar template de sub-tarefa
export class UpdateSubTaskTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsEnum(SubTaskExecutionMode)
  executionMode?: SubTaskExecutionMode;

  @IsOptional()
  @IsEnum(SubTaskAssignmentType)
  assignmentType?: SubTaskAssignmentType;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsUUID()
  assignedToSectorId?: string;

  @IsOptional()
  @IsNumber()
  slaHours?: number;

  @IsOptional()
  @IsNumber()
  slaDays?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// DTO para criar sub-tarefa manualmente
export class CreateSubTaskDto {
  @IsUUID()
  stepExecutionId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsNumber()
  slaHours?: number;

  @IsOptional()
  @IsBoolean()
  allowAttachment?: boolean;
}

// DTO para executar sub-tarefa
export class ExecuteSubTaskDto {
  @IsUUID()
  subTaskId: string;

  @IsEnum(SubTaskStatus)
  status: SubTaskStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}

// DTO para atualizar sub-tarefa
export class UpdateSubTaskDto {
  @IsOptional()
  @IsEnum(SubTaskStatus)
  status?: SubTaskStatus;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  executorId?: string;
}
