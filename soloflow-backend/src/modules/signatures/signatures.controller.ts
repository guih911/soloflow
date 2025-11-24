import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SignaturesService } from './signatures.service';
import { SignDocumentSimpleDto } from './dto/sign-document-simple.dto';
import { CreateSignatureRequirementDto } from './dto/create-signature-requirement.dto';
import { IpService } from '../../common/services/ip-service';

@Controller('signatures')
@UseGuards(JwtAuthGuard)
export class SignaturesController {
  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly ipService: IpService,
  ) {}

  /**
   * Assina um documento (requer autenticação)
   */
  @Post('sign')
  async signDocument(@Req() req, @Body() dto: SignDocumentSimpleDto) {
    try {
      // Capturar IP público real e User-Agent automaticamente
      dto.ipAddress = this.ipService.getClientIp(req);
      dto.userAgent = req.headers['user-agent'];

      console.log('📝 Signing document:', {
        userId: req.user.id,
        attachmentId: dto.attachmentId,
        stepExecutionId: dto.stepExecutionId,
      });

      const result = await this.signaturesService.signDocument(req.user.id, dto);

      console.log('✅ Document signed successfully:', result.signatureToken);

      return result;
    } catch (error) {
      console.error('❌ Error signing document:', {
        error: error.message,
        status: error.status,
        attachmentId: dto.attachmentId,
        userId: req.user.id,
      });
      throw error;
    }
  }

  /**
   * Cria requisito de assinatura
   */
  @Post('requirements')
  @UseGuards(JwtAuthGuard)
  async createRequirement(@Body() dto: CreateSignatureRequirementDto) {
    return this.signaturesService.createSignatureRequirement(dto);
  }

  /**
   * Cria múltiplos requisitos de assinatura de uma vez
   */
  @Post('requirements/batch')
  @UseGuards(JwtAuthGuard)
  async createMultipleRequirements(@Body() dtos: CreateSignatureRequirementDto[]) {
    return this.signaturesService.createMultipleSignatureRequirements(dtos);
  }

  /**
   * Lista requisitos de assinatura de uma etapa
   */
  @Get('requirements/step/:stepVersionId')
  @UseGuards(JwtAuthGuard)
  async getStepRequirements(@Param('stepVersionId') stepVersionId: string) {
    return this.signaturesService.getSignatureRequirements(stepVersionId);
  }

  /**
   * Lista assinaturas de um anexo
   */
  @Get('attachments/:attachmentId')
  @UseGuards(JwtAuthGuard)
  async getAttachmentSignatures(@Param('attachmentId') attachmentId: string) {
    return this.signaturesService.getAttachmentSignatures(attachmentId);
  }

  /**
   * Verifica assinaturas de um PDF
   */
  @Get('verify/:attachmentId')
  @UseGuards(JwtAuthGuard)
  async verifySignatures(@Param('attachmentId') attachmentId: string) {
    return this.signaturesService.verifySignatures(attachmentId);
  }

  /**
   * Download do PDF assinado
   */
  @Get('download/:attachmentId')
  @UseGuards(JwtAuthGuard)
  async downloadSignedPdf(
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const attachment = await this.signaturesService.getAttachmentForDownload(
      attachmentId,
    );

    if (!existsSync(attachment.path)) {
      throw new NotFoundException('Arquivo não encontrado no servidor');
    }

    const file = createReadStream(attachment.path);

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    });

    return new StreamableFile(file);
  }

  /**
   * Busca status detalhado das assinaturas de um anexo
   * Retorna informações sobre quem já assinou, quem está aguardando e a ordem
   */
  @Get('status/:attachmentId')
  @UseGuards(JwtAuthGuard)
  async getSignatureStatus(@Param('attachmentId') attachmentId: string, @Req() req) {
    return this.signaturesService.getSignatureStatus(attachmentId, req.user.id);
  }
}
