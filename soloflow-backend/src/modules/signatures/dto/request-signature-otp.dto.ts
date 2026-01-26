import { IsUUID, IsString } from 'class-validator';

export class RequestSignatureOtpDto {
  @IsUUID()
  attachmentId: string;

  @IsString()
  userPassword: string;
}
