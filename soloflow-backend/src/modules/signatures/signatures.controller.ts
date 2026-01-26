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
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { SignaturesService } from './signatures.service';
import { SignDocumentSimpleDto } from './dto/sign-document-simple.dto';
import { SignSubTaskDocumentDto } from './dto/sign-subtask-document.dto';
import { CreateSignatureRequirementDto } from './dto/create-signature-requirement.dto';
import { RequestSignatureOtpDto } from './dto/request-signature-otp.dto';
import { VerifySignatureOtpDto } from './dto/verify-signature-otp.dto';
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
  @UseGuards(RateLimitGuard)
  async signDocument(@Req() req, @Body() dto: SignDocumentSimpleDto) {
    // Capturar IP público real e User-Agent automaticamente
    dto.ipAddress = this.ipService.getClientIp(req);
    dto.userAgent = req.headers['user-agent'];

    return this.signaturesService.signDocument(req.user.id, dto);
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

  /**
   * Assina um documento de sub-tarefa
   * Sub-tarefas têm seu próprio sistema de anexos separado da tabela Attachment
   */
  @Post('sign-subtask')
  @UseGuards(RateLimitGuard)
  async signSubTaskDocument(@Req() req, @Body() dto: SignSubTaskDocumentDto) {
    // Capturar IP público real e User-Agent automaticamente
    dto.ipAddress = this.ipService.getClientIp(req);
    dto.userAgent = req.headers['user-agent'];

    return this.signaturesService.signSubTaskDocument(req.user.id, dto);
  }

  /**
   * Solicita um código OTP por email para assinatura digital (2FA)
   * Valida a senha do usuário antes de enviar o código
   */
  @Post('request-otp')
  @UseGuards(RateLimitGuard)
  async requestSignatureOtp(@Req() req, @Body() dto: RequestSignatureOtpDto) {
    return this.signaturesService.requestSignatureOtp(req.user.id, dto);
  }

  /**
   * Verifica o código OTP e realiza a assinatura do documento (2FA)
   * A senha já foi validada na etapa de solicitação do OTP
   */
  @Post('verify-otp')
  @UseGuards(RateLimitGuard)
  async verifySignatureOtp(@Req() req, @Body() dto: VerifySignatureOtpDto) {
    // Capturar IP público real e User-Agent automaticamente
    dto.ipAddress = this.ipService.getClientIp(req);
    dto.userAgent = req.headers['user-agent'];

    return this.signaturesService.verifySignatureOtpAndSign(req.user.id, dto);
  }
}
