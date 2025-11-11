import { IsString, IsOptional, IsUUID, IsInt, IsBoolean, IsEnum } from 'class-validator';

export enum SignatureTypeDto {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
}

export class CreateSignatureRequirementDto {
  @IsUUID()
  stepVersionId: string;

  @IsInt()
  order: number; // Ordem de assinatura (1, 2, 3...)

  @IsEnum(SignatureTypeDto)
  type: SignatureTypeDto;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  description?: string; // Descrição do que deve ser assinado

  // Atribuição do assinante (um dos dois deve ser informado)
  @IsUUID()
  @IsOptional()
  userId?: string; // Usuário específico

  @IsUUID()
  @IsOptional()
  sectorId?: string; // Setor (qualquer usuário do setor pode assinar)

  @IsUUID()
  @IsOptional()
  attachmentId?: string; // Anexo específico (opcional)
}
