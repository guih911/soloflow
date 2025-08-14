import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      // Criar diretório baseado no tipo de processo ou stepExecution
      const uploadPath = join(process.cwd(), 'uploads', 'attachments');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Gerar nome único para o arquivo
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Tipos de arquivo permitidos
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new BadRequestException('Tipo de arquivo não permitido'), false);
    }

    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limite
  },
};