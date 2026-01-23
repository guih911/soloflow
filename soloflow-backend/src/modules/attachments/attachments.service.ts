import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, R2_FOLDERS } from '../storage/storage.service';
import { Readable } from 'stream';
import { fixFilenameEncoding } from '../../config/multer.config';

export interface CreateAttachmentData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string; // Now stores the R2 key instead of local path
  stepExecutionId: string;
  fieldName?: string;
  isStepFormField?: boolean;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * Upload file to R2 and create attachment record
   */
  async uploadAndCreate(
    file: Express.Multer.File,
    stepExecutionId: string,
    fieldName?: string,
    isStepFormField?: boolean,
  ) {
    // Upload to R2
    const uploadResult = await this.storageService.upload(file, R2_FOLDERS.ANEXOS);

    // Create attachment record
    return this.createAttachment({
      filename: uploadResult.filename,
      originalName: fixFilenameEncoding(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      path: uploadResult.key, // Store R2 key
      stepExecutionId,
      fieldName,
      isStepFormField,
    });
  }

  /**
   * Create attachment record (for backward compatibility)
   */
  async createAttachment(data: CreateAttachmentData) {
    const signatureData = data.isStepFormField
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

  /**
   * Get file stream from R2
   */
  async getFileStream(id: string): Promise<{ stream: Readable; attachment: any; metadata: { size: number } }> {
    const attachment = await this.findOne(id);

    const { stream, metadata } = await this.storageService.download(attachment.path);

    return { stream, attachment, metadata };
  }

  /**
   * Get file buffer from R2
   */
  async getFileBuffer(id: string): Promise<{ buffer: Buffer; attachment: any }> {
    const attachment = await this.findOne(id);

    const buffer = await this.storageService.getBuffer(attachment.path);

    return { buffer, attachment };
  }

  /**
   * Check if file exists in R2
   */
  async fileExists(id: string): Promise<boolean> {
    const attachment = await this.findOne(id);
    return this.storageService.exists(attachment.path);
  }

  async signAttachment(id: string, signatureData: any) {
    return this.prisma.attachment.update({
      where: { id },
      data: {
        isSigned: true,
        signatureData: JSON.stringify(signatureData),
        signedPath: `signed/${Date.now()}.pdf`,
      },
    });
  }

  async findByStepExecution(stepExecutionId: string) {
    return this.prisma.attachment.findMany({
      where: { stepExecutionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Delete attachment and its file from R2
   */
  async deleteAttachment(id: string): Promise<void> {
    const attachment = await this.findOne(id);

    // Delete from R2
    await this.storageService.delete(attachment.path);

    // Delete from database
    await this.prisma.attachment.delete({
      where: { id },
    });
  }
}