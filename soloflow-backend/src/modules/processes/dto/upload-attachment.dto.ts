import { IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UploadAttachmentDto {
  @IsUUID()
  processInstanceId: string;

  @IsOptional()
  @IsUUID()
  stepExecutionId?: string;

  @IsOptional()
  @IsString()
  fieldName?: string; 

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