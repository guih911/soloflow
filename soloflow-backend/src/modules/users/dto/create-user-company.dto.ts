import { IsString, IsEmail, IsEnum, Length, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserCompanyDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 50)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
