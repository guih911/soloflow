import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Attachment } from '@prisma/client';
import { SignAttachmentDto } from './dto/sign-attachment.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class AttachmentsService {
  private readonly uploadDir = './uploads';

  constructor(private prisma: PrismaService) {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    stepExecutionId: string,
    userId: string
  ): Promise<Attachment> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: stepExecutionId },
      include: { step: true },
    });

    if (!stepExecution) throw new NotFoundException('Execução de etapa não encontrada');
    if (!stepExecution.step.allowAttachment) throw new BadRequestException('Esta etapa não permite anexos');
    if (stepExecution.status !== 'IN_PROGRESS') throw new BadRequestException('Só é possível anexar arquivos em etapas em progresso');

    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.writeFile(filePath, file.buffer);

    return this.prisma.attachment.create({
      data: {
        filename: fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        stepExecutionId,
      },
    });
  }

  async getFile(attachmentId: string, userId: string): Promise<{ attachment: Attachment; buffer: Buffer }> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        stepExecution: {
          include: {
            processInstance: {
              include: { processType: true },
            },
          },
        },
      },
    });

    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    const buffer = await fs.readFile(attachment.path);
    return { attachment, buffer };
  }

  async signAttachment(
    attachmentId: string,
    userId: string,
    signDto: SignAttachmentDto
  ): Promise<Attachment> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        stepExecution: {
          include: {
            step: true,
            processInstance: true,
          },
        },
      },
    });

    if (!attachment) throw new NotFoundException('Anexo não encontrado');
    if (!attachment.stepExecution.step.requiresSignature) throw new BadRequestException('Esta etapa não requer assinatura');
    if (attachment.isSigned) throw new BadRequestException('Este documento já foi assinado');
    if (!attachment.mimeType.includes('pdf')) throw new BadRequestException('Apenas arquivos PDF podem ser assinados');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const isPasswordValid = await bcrypt.compare(signDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Senha inválida');

    try {
      const originalPdfBytes = await fs.readFile(attachment.path);
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawText('ASSINATURA DIGITAL', {
        x: 50, y: height - 100, size: 20, font: boldFont, color: rgb(0, 0, 0),
      });

      const signatureInfo = [
        `Documento assinado digitalmente por: ${user.name}`,
        `E-mail: ${user.email}`,
        `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
        `Processo: ${attachment.stepExecution.processInstance.code}`,
        `Tipo de assinatura: ${signDto.signatureType === 'draw' ? 'Desenho' : 'Texto'}`,
      ];

      let yPosition = height - 150;
      signatureInfo.forEach(info => {
        page.drawText(info, { x: 50, y: yPosition, size: 12, font, color: rgb(0, 0, 0) });
        yPosition -= 25;
      });

      const validationHash = crypto
        .createHash('sha256')
        .update(`${user.id}-${attachmentId}-${new Date().toISOString()}`)
        .digest('hex');

      page.drawText('Hash de validação:', {
        x: 50, y: yPosition - 25, size: 10, font: boldFont, color: rgb(0, 0, 0),
      });

      page.drawText(validationHash, {
        x: 50, y: yPosition - 40, size: 8, font, color: rgb(0, 0, 0),
      });

      if (signDto.signatureType === 'draw' && signDto.signature) {
        page.drawText('[Assinatura Digital]', {
          x: 50, y: yPosition - 80, size: 14, font: boldFont, color: rgb(0, 0, 0.5),
        });
      } else if (signDto.signatureType === 'text') {
        page.drawText(signDto.signature, {
          x: 50, y: yPosition - 80, size: 24, font: boldFont, color: rgb(0, 0, 0.5),
        });
      }

      page.drawText('Este documento foi assinado digitalmente e possui validade jurídica.', {
        x: 50, y: 50, size: 10, font, color: rgb(0.5, 0.5, 0.5),
      });

      const signedPdfBytes = await pdfDoc.save();
      const signedFileName = `signed-${attachment.filename}`;
      const signedPath = path.join(this.uploadDir, signedFileName);
      await fs.writeFile(signedPath, signedPdfBytes);

      const signatureData = {
        userId,
        userName: user.name,
        userEmail: user.email,
        signatureType: signDto.signatureType,
        signedAt: new Date(),
        validationHash,
        metadata: signDto.metadata,
      };

      const updatedAttachment = await this.prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          isSigned: true,
          signedPath,
          signatureData: JSON.stringify(signatureData),
        },
      });

      await this.prisma.stepExecution.update({
        where: { id: attachment.stepExecutionId },
        data: { signedAt: new Date() },
      });

      return updatedAttachment;
    } catch (error) {
      console.error('Erro ao assinar documento:', error);
      throw new BadRequestException('Erro ao processar assinatura digital');
    }
  }

  async deleteFile(attachmentId: string): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    try {
      await fs.unlink(attachment.path);
      if (attachment.signedPath) await fs.unlink(attachment.signedPath);
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
    }

    await this.prisma.attachment.delete({
      where: { id: attachmentId },
    });
  }
}
