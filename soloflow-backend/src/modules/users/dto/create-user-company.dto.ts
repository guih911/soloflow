import { IsString, IsEmail, IsEnum, Length, IsUUID, IsOptional, IsBoolean, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class UserCompanyAssignmentDto {
  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.USER; // ✅ Opcional, padrão USER (mantido para compatibilidade de API)

  @IsOptional()
  @IsUUID()
  sectorId?: string;

  @IsUUID()
  profileId: string; // ✅ Obrigatório - Perfil controla TODAS as permissões

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

  @IsString()
  @Transform(({ value }) => {
    if (!value) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }
    return value;
  })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF inválido. Informe 11 dígitos numéricos.'
  })
  cpf: string;

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

