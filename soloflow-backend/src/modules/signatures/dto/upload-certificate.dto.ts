import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UploadCertificateDto {
  @IsString()
  name: string; // Nome amigável do certificado

  @IsString()
  password: string; // Senha do certificado PFX/P12

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean; // Se este será o certificado padrão

  @IsString()
  @IsOptional()
  userPassword?: string; // Senha do usuário para confirmar a operação
}
