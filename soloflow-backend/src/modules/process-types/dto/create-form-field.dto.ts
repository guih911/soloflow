import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsArray, IsObject, Min, Length } from 'class-validator';
import { FieldType } from '@prisma/client';

export class CreateFormFieldDto {
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
  };

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsString()
  helpText?: string;
}