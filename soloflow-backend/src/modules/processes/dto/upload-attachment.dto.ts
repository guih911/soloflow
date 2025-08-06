import { IsUUID } from 'class-validator';

export class UploadAttachmentDto {
  @IsUUID()
  stepExecutionId: string;
}