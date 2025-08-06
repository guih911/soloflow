import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

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