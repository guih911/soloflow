import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsUUID, IsArray, Min, Max, Length, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepType, FieldType } from '@prisma/client';

export interface InputStepConditions {
  // Campos dinâmicos para a etapa
  fields?: StepFieldDto[];
  
  // Lista de nomes de campos visíveis nesta etapa
  visibleFields?: string[];
  
  // Lista de nomes de campos obrigatórios nesta etapa
  requiredFields?: string[];
  
  // Campos que serão armazenados apenas no metadata da execução
  stepLocalFields?: string[];
  
  // Configurações especiais para validações específicas de campos
  overrides?: Record<string, {
    regex?: string;
    min?: number;
    max?: number;
    errorMessage?: string;
  }>;
  
  // Campos para pré-preencher com dados de outras etapas
  prefillFrom?: Array<{
    stepOrder: number;
    fields: string[];
  }>;
}

export class StepFieldDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsString()
  @Length(1, 100)
  label: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsBoolean()
  required: boolean = false;

  @IsInt()
  @Min(1)
  order: number;

  @IsOptional()
  @IsArray()
  options?: any[]; // Para dropdown/checkbox

  @IsOptional()
  @IsObject()
  validations?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
  };

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsString()
  helpText?: string;
}

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
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'SLA deve ser no mínimo 1 hora' })
  @Max(8760, { message: 'SLA deve ser no máximo 8760 horas (1 ano)' })
  slaHours?: number;

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
  conditions?: Record<string, any>;

  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepFieldDto)
  inputFields?: StepFieldDto[];

  // ✅ MANTIDO: typeConfig genérico para outros tipos
  @IsOptional()
  @IsObject()
  typeConfig?: {
    // Para INPUT: campos específicos (AGORA USANDO inputFields)
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