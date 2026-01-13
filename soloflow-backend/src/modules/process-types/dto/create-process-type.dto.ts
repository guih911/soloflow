import { IsString, IsOptional, Length, IsUUID, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateStepDto } from './create-step.dto';
import { CreateFormFieldDto } from './create-form-field.dto';

export class CreateProcessTypeDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isChildProcessOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSubProcesses?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSubTasks?: boolean;

  @IsUUID()
  companyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStepDto)
  steps: CreateStepDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  formFields?: CreateFormFieldDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowedChildProcessTypes?: string[];
}