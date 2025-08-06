import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SignAttachmentDto } from './dto/sign-attachment.dto';

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      // Aceitar apenas alguns tipos de arquivo
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Tipo de arquivo não permitido'), false);
      }
    },
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('stepExecutionId') stepExecutionId: string,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo não fornecido');
    }

    return this.attachmentsService.uploadFile(file, stepExecutionId, req.user.id);
  }

  @Get(':id')
  async download(
    @Param('id') id: string,
    @Res() res: Response,
    @Request() req
  ) {
    const { attachment, buffer } = await this.attachmentsService.getFile(id, req.user.id);

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
    });

    res.send(buffer);
  }

 @Post(':id/sign')
async sign(
  @Param('id') id: string,
  @Body() signatureData: SignAttachmentDto,
  @Request() req
) {
  return this.attachmentsService.signAttachment(id, req.user.id, signatureData);
}

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.attachmentsService.deleteFile(id);
    return { success: true };
  }
}
