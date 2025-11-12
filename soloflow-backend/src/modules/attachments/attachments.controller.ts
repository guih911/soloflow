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
  Header,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Configuração do Multer para upload
// Usa UUID para garantir nomes únicos e evitar colisões
const storage = diskStorage({
  destination: './uploads/attachments',
  filename: (req, file, callback) => {
    // Gera nome único usando UUID v4 + extensão original
    // Isso garante 100% de segurança contra colisões de nomes
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    callback(null, uniqueName);
  },
});

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.attachmentsService.createAttachment({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      stepExecutionId: body.stepExecutionId,
    });
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10, { storage }))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Body() body: any) {
  const attachments: any[] = [];
    
    for (const file of files) {
      const attachment= await this.attachmentsService.createAttachment({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        stepExecutionId: body.stepExecutionId,
      });
      attachments.push(attachment);
    }
    
    return attachments;
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const attachment = await this.attachmentsService.findOne(id);
    
    if (!attachment || !existsSync(attachment.path)) {
      throw new Error('Arquivo não encontrado');
    }

    const file = createReadStream(attachment.path);
    
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
    });

    return new StreamableFile(file);
  }

  @Get(':id/view')
  async viewFile(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const attachment = await this.attachmentsService.findOne(id);
    
    if (!attachment || !existsSync(attachment.path)) {
      throw new Error('Arquivo não encontrado');
    }

    const file = createReadStream(attachment.path);
    
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `inline; filename="${attachment.originalName}"`,
    });

    return new StreamableFile(file);
  }

  @Post(':id/sign')
  async signAttachment(@Param('id') id: string, @Body() signatureData: any) {
    return this.attachmentsService.signAttachment(id, signatureData);
  }
}