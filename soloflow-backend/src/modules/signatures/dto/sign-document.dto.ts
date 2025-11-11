import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SignDocumentDto {
  @IsUUID()
  attachmentId: string; // ID do anexo a ser assinado

  @IsUUID()
  stepExecutionId: string; // ID da execução da etapa

  @IsUUID()
  @IsOptional()
  certificateId?: string; // ID do certificado (usa o padrão se não informado)

  @IsString()
  certificatePassword: string; // Senha do certificado PFX

  @IsString()
  @IsOptional()
  reason?: string; // Motivo da assinatura

  @IsString()
  @IsOptional()
  location?: string; // Localização da assinatura

  @IsString()
  @IsOptional()
  contactInfo?: string; // Informação de contato

  // Metadados adicionais
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  geolocation?: string;
}
