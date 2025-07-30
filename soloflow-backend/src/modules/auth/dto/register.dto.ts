import { IsString, IsEmail, Length, IsUUID } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 50)
  password: string;

  @IsUUID()
  companyId: string;
}