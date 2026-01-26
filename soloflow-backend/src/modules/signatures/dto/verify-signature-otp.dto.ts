import { IsUUID, IsString, Length, IsOptional } from 'class-validator';

export class VerifySignatureOtpDto {
  @IsUUID()
  attachmentId: string;

  @IsString()
  @Length(6, 6)
  otpCode: string;

  @IsOptional()
  @IsString()
  stepExecutionId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsString()
  geolocation?: string;
}
