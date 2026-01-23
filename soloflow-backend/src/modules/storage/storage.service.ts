import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Readable } from 'stream';
import { fixFilenameEncoding } from '../../config/multer.config';

// Nomes das pastas no R2 (em português)
export const R2_FOLDERS = {
  ANEXOS: 'anexos',
  SUBTAREFAS: 'subtarefas',
  ASSINATURAS: 'assinaturas',
} as const;

export interface UploadResult {
  key: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  lastModified?: Date;
}

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'soloflow-attachments';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    this.logger.log('R2 Storage Service initialized');
  }

  /**
   * Upload a file buffer to R2
   */
  async upload(
    file: Express.Multer.File,
    folder: string = R2_FOLDERS.ANEXOS,
  ): Promise<UploadResult> {
    const fixedOriginalName = fixFilenameEncoding(file.originalname);
    const ext = extname(fixedOriginalName);
    const filename = `${uuidv4()}${ext}`;
    const key = `${folder}/${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: encodeURIComponent(fixedOriginalName),
        },
      });

      await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url: this.getPublicUrl(key),
        filename,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upload a buffer directly to R2
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = R2_FOLDERS.ANEXOS,
  ): Promise<UploadResult> {
    const ext = extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const key = `${folder}/${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalName: encodeURIComponent(originalName),
        },
      });

      await this.s3Client.send(command);

      this.logger.log(`Buffer uploaded successfully: ${key}`);

      return {
        key,
        url: this.getPublicUrl(key),
        filename,
        size: buffer.length,
        mimeType,
      };
    } catch (error) {
      this.logger.error(`Failed to upload buffer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upload a buffer to R2 replacing an existing file (same key)
   */
  async replaceBuffer(
    buffer: Buffer,
    existingKey: string,
    originalName: string,
    mimeType: string,
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: existingKey,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalName: encodeURIComponent(originalName),
        },
      });

      await this.s3Client.send(command);

      this.logger.log(`Buffer replaced successfully: ${existingKey}`);

      const filename = existingKey.split('/').pop() || existingKey;

      return {
        key: existingKey,
        url: this.getPublicUrl(existingKey),
        filename,
        size: buffer.length,
        mimeType,
      };
    } catch (error) {
      this.logger.error(`Failed to replace buffer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Download a file from R2
   */
  async download(key: string): Promise<{ stream: Readable; metadata: FileMetadata }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        stream: response.Body as Readable,
        metadata: {
          key,
          size: response.ContentLength || 0,
          mimeType: response.ContentType || 'application/octet-stream',
          lastModified: response.LastModified,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to download file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get file as buffer from R2
   */
  async getBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as Readable;

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to get file buffer: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from R2
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return key;
  }

  /**
   * Generate a unique key for a file
   */
  generateKey(originalName: string, folder: string = R2_FOLDERS.ANEXOS): string {
    const ext = extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    return `${folder}/${filename}`;
  }
}
