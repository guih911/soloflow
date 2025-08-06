import { IsString, IsOptional, Length, IsUUID } from 'class-validator';

export class CreateSectorDto {
  @IsString()
  @Length(2, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @IsUUID()
  companyId: string;
}