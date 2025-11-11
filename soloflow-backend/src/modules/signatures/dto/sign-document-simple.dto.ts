import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SignDocumentSimpleDto {
  @IsUUID()
  attachmentId: string; // ID do anexo a ser assinado

  @IsUUID()
  stepExecutionId: string; // ID da execução da etapa

  @IsUUID()
  @IsOptional()
  requirementId?: string; // ID do requisito de assinatura específico (opcional)

  @IsString()
  userPassword: string; // Senha do usuário para validar

  @IsString()
  @IsOptional()
  reason?: string; // Motivo da assinatura

  @IsString()
  @IsOptional()
  location?: string; // Localização da assinatura

  @IsString()
  @IsOptional()
  contactInfo?: string; // Informação de contato

  // Metadados adicionais (capturados automaticamente)
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
