import { IsString, IsEmail, Length, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 50)
  password: string;

  @IsString()
  @IsOptional()
  cpf?: string; // CPF necessário para assinatura digital

  @IsString()
  @IsOptional()
  phone?: string; // Telefone do usuário
}