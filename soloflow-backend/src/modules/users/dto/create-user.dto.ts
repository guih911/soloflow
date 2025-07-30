import { IsString, IsEmail, IsEnum, Length, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
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
}