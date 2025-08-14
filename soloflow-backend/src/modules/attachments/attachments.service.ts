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
  }) {
    return this.prisma.attachment.create({
      data,
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