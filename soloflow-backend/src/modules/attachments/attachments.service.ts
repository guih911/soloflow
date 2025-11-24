import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async createAttachment(data: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
    stepExecutionId: string;
    fieldName?: string;
    isStepFormField?: boolean;
  }) {
    // Se é um arquivo de campo do formulário da etapa, marcar no signatureData
    const signatureData =
      data.isStepFormField
        ? JSON.stringify({
            isStepFormField: true,
            fieldName: data.fieldName || null,
          })
        : null;

    return this.prisma.attachment.create({
      data: {
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        path: data.path,
        stepExecutionId: data.stepExecutionId,
        signatureData,
      },
    });
  }

  async findOne(id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    return attachment;
  }

  async signAttachment(id: string, signatureData: any) {
    return this.prisma.attachment.update({
      where: { id },
      data: {
        isSigned: true,
        signatureData: JSON.stringify(signatureData),
        signedPath: `signed-${Date.now()}.pdf`,
      },
    });
  }

  async findByStepExecution(stepExecutionId: string) {
    return this.prisma.attachment.findMany({
      where: { stepExecutionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}