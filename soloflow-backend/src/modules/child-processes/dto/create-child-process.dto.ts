import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateChildProcessDto {
  @IsUUID()
  parentProcessInstanceId: string;

  @IsUUID()
  childProcessTypeId: string;

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
  @IsUUID()
  configId?: string;

  @IsOptional()
  @IsUUID()
  originStepExecutionId?: string;
}