// soloflow-backend/src/modules/process-types/dto/create-step.dto.ts - MELHORADO
import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsUUID, IsArray, Min, Max, Length, IsObject } from 'class-validator';
import { StepType } from '@prisma/client';

export class CreateStepDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000, { message: 'Instruções devem ter no máximo 2000 caracteres' })
  instructions?: string; // ✅ Texto explicativo para orientar execução

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'SLA deve ser maior ou igual a 0 minutos' })
  @Max(43200, { message: 'SLA deve ser no máximo 43200 minutos (30 dias)' })
  slaMinutes?: number; // ✅ SLA em minutos para maior precisão

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'SLA deve ser no mínimo 1 hora' })
  @Max(8760, { message: 'SLA deve ser no máximo 8760 horas (1 ano)' })
  slaHours?: number; // ✅ Mantido para compatibilidade

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

  // ✅ NOVOS CAMPOS PARA TIPOS ESPECÍFICOS
  @IsOptional()
  @IsObject()
  typeConfig?: {
    // Para INPUT: campos específicos
    requiredFields?: string[];
    validation?: Record<string, any>;
    
    // Para APPROVAL: critérios
    approvalCriteria?: string;
    requireJustification?: boolean;
    
    // Para UPLOAD: configurações de arquivo
    maxFileSize?: number;
    acceptedFormats?: string[];
    
    // Para SIGNATURE: configurações de assinatura
    signatureType?: 'digital' | 'electronic';
    requireCertificate?: boolean;
    
    // Para REVIEW: checklist
    reviewChecklist?: string[];
  };
}