import { IsString, IsOptional } from 'class-validator';

export class ValidateSignaturePublicDto {
  @IsString()
  signatureToken: string; // Token exibido no PDF

  @IsString()
  @IsOptional()
  documentHash?: string; // Hash do documento (opcional) para verificar integridade
}
