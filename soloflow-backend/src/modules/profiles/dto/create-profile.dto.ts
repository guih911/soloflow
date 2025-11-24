import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProfilePermissionInput {
  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsOptional()
  scope?: Record<string, any>;
}

export class ProfileProcessTypeInput {
  @IsString()
  @IsNotEmpty()
  processTypeId: string;

  @IsOptional()
  @IsBoolean()
  canView?: boolean = true;

  @IsOptional()
  @IsBoolean()
  canCreate?: boolean = false;

  @IsOptional()
  @IsBoolean()
  canExecute?: boolean = false;
}

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfilePermissionInput)
  permissions?: ProfilePermissionInput[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileProcessTypeInput)
  processTypes?: ProfileProcessTypeInput[];
}
