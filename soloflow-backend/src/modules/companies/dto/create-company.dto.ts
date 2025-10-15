import { IsString, IsEmail, IsOptional, Length, Matches } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @Length(3, 100)
  name: string;

  @IsString()
  @Matches(/^(?:\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/, {
    message: 'CNPJ deve conter 14 dígitos (com ou sem formatação)',
  })
  cnpj: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{10,11}|\(\d{2}\) \d{4,5}-\d{4})$/, {
    message: 'Telefone deve conter 10 ou 11 dígitos (com ou sem formatação)',
  })
  phone?: string;
}
