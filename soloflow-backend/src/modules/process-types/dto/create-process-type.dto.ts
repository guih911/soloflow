import { IsString, IsOptional, Length, IsUUID, IsArray, ValidateNested } from 'class-validator';
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
}