import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsUUID } from 'class-validator';
import { ChildProcessMode } from '@prisma/client';

export class CreateChildProcessConfigDto {
  @IsString()
  name: string;

  @IsUUID()
  processInstanceId: string;

  @IsUUID()
  childProcessTypeId: string;

  @IsEnum(ChildProcessMode)
  mode: ChildProcessMode;

  @IsOptional()
  @IsUUID()
  triggerStepVersionId?: string;

  @IsOptional()
  @IsObject()
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval?: number;
    dayOfMonth?: number;
    dayOfWeek?: number;
    time?: string;
    maxRuns?: number;
    startDate?: string;
    endDate?: string;
  };

  @IsOptional()
  @IsBoolean()
  waitForCompletion?: boolean;

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @IsOptional()
  @IsObject()
  inputDataMapping?: Record<string, string>;
}