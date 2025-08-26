import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsUUID, IsArray, Min, Max, Length, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepType, FieldType } from '@prisma/client';

export interface InputStepConditions {

  fields?: StepFieldDto[];

  visibleFields?: string[];
 
  requiredFields?: string[];
  
 
  stepLocalFields?: string[];
 
  overrides?: Record<string, {
    regex?: string;
    min?: number;
    max?: number;
    errorMessage?: string;
  }>;
  

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
  options?: any[]; 

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
  @Length(0, 2000, { message: 'InstruÃ§Ãµes devem ter no mÃ¡ximo 2000 caracteres' })
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'SLA deve ser no mÃ­nimo 1 hora' })
  @Max(8760, { message: 'SLA deve ser no mÃ¡ximo 8760 horas (1 ano)' })
  slaHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'SLA deve ser no mÃ­nimo 1 dia' })
  @Max(365, { message: 'SLA deve ser no mÃ¡ximo 365 dias (1 ano)' })
  slaDays?: number;

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
  @IsBoolean()
  assignedToCreator?: boolean;

  
  @IsOptional()
  @IsObject()
  assignmentConditions?: Record<string, any>;

  
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsObject()
  flowConditions?: Record<string, any>;


  @IsOptional()
  @IsBoolean()
  reuseData?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepFieldDto)
  inputFields?: StepFieldDto[];

  @IsOptional()
  @IsObject()
  typeConfig?: {

    requiredFields?: string[];
    validation?: Record<string, any>;
    

    approvalCriteria?: string;
    requireJustification?: boolean;
    

    maxFileSize?: number;
    acceptedFormats?: string[];
    

    signatureType?: 'digital' | 'electronic';
    requireCertificate?: boolean;
    
    
    reviewChecklist?: string[];
  };
}