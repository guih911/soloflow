import { IsString, IsOptional, IsUUID } from 'class-validator';

export class SignSubTaskDocumentDto {
  @IsUUID()
  subTaskId: string; // ID da sub-tarefa que contém o anexo

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
