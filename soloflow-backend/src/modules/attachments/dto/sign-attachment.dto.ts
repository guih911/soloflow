import { IsString, IsEnum, IsObject } from 'class-validator';

export class SignAttachmentDto {
  @IsString()
  password: string;

  @IsString()
  signature: string; // Base64 da assinatura

  @IsEnum(['draw', 'text'])
  signatureType: 'draw' | 'text';

  @IsObject()
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
  };
}