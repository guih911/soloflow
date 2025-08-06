import { IsUUID, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AddUserCompanyDto {
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