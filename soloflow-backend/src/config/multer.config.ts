import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

// Tipos de arquivo permitidos
export const ALLOWED_MIME_TYPES = [
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
  'text/csv',
];

// Tamanho máximo do arquivo (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const multerConfig = {
  // Usar memoryStorage para manter o arquivo em buffer
  // Isso permite fazer upload direto para o R2 sem salvar em disco
  storage: memoryStorage(),
  fileFilter: (req: any, file: Express.Multer.File, cb: any) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new BadRequestException('Tipo de arquivo não permitido'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};