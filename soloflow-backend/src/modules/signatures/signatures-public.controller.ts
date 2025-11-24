import { Controller, Post, Body } from '@nestjs/common';
import { SignaturesService } from './signatures.service';
import { ValidateSignaturePublicDto } from './dto/validate-signature-public.dto';

/**
 * Controller público para validação de assinaturas
 * NÃO requer autenticação
 */
@Controller('signatures/public')
export class SignaturesPublicController {
  constructor(private readonly signaturesService: SignaturesService) {}

  /**
   * Validação pública de assinatura (SEM autenticação)
   * Qualquer pessoa pode validar uma assinatura com o token
   */
  @Post('validate')
  async validateSignature(@Body() dto: ValidateSignaturePublicDto) {
    return this.signaturesService.validatePublicSignature(
      dto.signatureToken,
      dto.documentHash,
    );
  }
}
