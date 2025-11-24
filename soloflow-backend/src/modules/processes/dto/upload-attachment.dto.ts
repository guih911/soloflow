import { IsUUID, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UploadAttachmentDto {
  @IsOptional()
  @IsUUID()
  processInstanceId?: string;

  @IsOptional()
  @IsUUID()
  stepExecutionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nome do campo deve ter no máximo 100 caracteres' })
  fieldName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  description?: string;

  @IsOptional()
  isStepFormField?: boolean;
}

export class ProcessFileUploadDto {
  @IsUUID()
  processInstanceId: string;

  @MaxLength(100, { message: 'Nome do campo deve ter no máximo 100 caracteres' })

  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: 'Nome do campo deve ter no máximo 100 caracteres' })
  fieldName: string; 
}