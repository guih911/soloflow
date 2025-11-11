import { IsUUID, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AssignUserCompanyDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  companyId: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsUUID()
  sectorId?: string;


  @IsOptional()
  @IsUUID()
  profileId?: string;
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
