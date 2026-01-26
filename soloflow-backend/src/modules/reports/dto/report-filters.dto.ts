import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';

export enum ReportType {
  DASHBOARD = 'DASHBOARD',
  PERFORMANCE = 'PERFORMANCE',
  PROCESSES = 'PROCESSES',
  TASKS = 'TASKS',
  AUDIT = 'AUDIT',
  SECTORS = 'SECTORS',
}

export class ReportFiltersDto {
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sectorId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
