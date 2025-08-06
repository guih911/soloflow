import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsUUID, IsArray, Min, Length, IsObject } from 'class-validator';
import { StepType } from '@prisma/client';

export class CreateStepDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(StepType)
  type: StepType;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsBoolean()
  allowAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSignature?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAttachment?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minAttachments?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttachments?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actions?: string[];

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsUUID()
  assignedToSectorId?: string;

  @IsOptional()
  @IsObject()
  conditions?: {
    [action: string]: number | 'END' | 'PREVIOUS';
  };
}