import { IsString, IsEnum } from 'class-validator';

export class ValidateSignatureDto {
  @IsString()
  password: string;

  @IsString()
  signature: string; // Base64 da assinatura (desenho ou texto)

  @IsEnum(['draw', 'text'])
  signatureType: 'draw' | 'text';
}