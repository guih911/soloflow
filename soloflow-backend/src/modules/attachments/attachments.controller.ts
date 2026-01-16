import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerConfig } from '../../config/multer.config';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.attachmentsService.uploadAndCreate(
      file,
      body.stepExecutionId,
      body.fieldName,
      body.isStepFormField === 'true' || body.isStepFormField === true,
    );
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Body() body: any) {
    const attachments: any[] = [];

    for (const file of files) {
      const attachment = await this.attachmentsService.uploadAndCreate(
        file,
        body.stepExecutionId,
      );
      attachments.push(attachment);
    }

    return attachments;
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    try {
      const { stream, attachment, metadata } = await this.attachmentsService.getFileStream(id);

      res.set({
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        'Content-Length': metadata.size.toString(),
      });

      return new StreamableFile(stream);
    } catch (error) {
      throw new NotFoundException('Arquivo não encontrado');
    }
  }

  @Get(':id/view')
  async viewFile(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    try {
      const { stream, attachment, metadata } = await this.attachmentsService.getFileStream(id);

      res.set({
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
        'Content-Length': metadata.size.toString(),
      });

      return new StreamableFile(stream);
    } catch (error) {
      throw new NotFoundException('Arquivo não encontrado');
    }
  }

  @Post(':id/sign')
  async signAttachment(@Param('id') id: string, @Body() signatureData: any) {
    return this.attachmentsService.signAttachment(id, signatureData);
  }
}