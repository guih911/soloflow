import { IsString, IsEmail, IsEnum, Length, IsUUID, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserCompanyAssignmentDto {
  @IsUUID()
  companyId: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateUserCompanyDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 50)
  password: string;


  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

 
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCompanyAssignmentDto)
  companies?: UserCompanyAssignmentDto[];
}

