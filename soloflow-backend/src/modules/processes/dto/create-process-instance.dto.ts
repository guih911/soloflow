// soloflow-backend/src/modules/processes/dto/create-process-instance.dto.ts (CORRIGIDO)
import { IsString, IsOptional, IsUUID, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// ✅ DTO para dados de arquivo
export class FileDataDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  file?: any; // O arquivo real será processado separadamente
}

// ✅ DTO principal corrigido
export class CreateProcessInstanceDto {
  @IsUUID()
  processTypeId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  formData?: Record<string, any>; 

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>; 
}