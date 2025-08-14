import { IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UploadAttachmentDto {
  @IsUUID()
  processInstanceId: string;

  @IsOptional()
  @IsUUID()
  stepExecutionId?: string;

  @IsOptional()
  @IsString()
  fieldName?: string; // Nome do campo dinâmico de arquivo

  @IsOptional()
  @IsString()
  description?: string;
}

export class ProcessFileUploadDto {
  @IsUUID()
  processInstanceId: string;

  @IsNotEmpty()
  @IsString()
  fieldName: string; 
}