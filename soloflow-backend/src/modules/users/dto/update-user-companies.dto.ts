import { IsArray, ValidateNested, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
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
  @IsUUID()
  profileId?: string;
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateUserCompaniesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCompanyAssignmentDto)
  companies?: UserCompanyAssignmentDto[];
}