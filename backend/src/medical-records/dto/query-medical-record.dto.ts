import { IsOptional, IsString } from 'class-validator';

export class QueryMedicalRecordDto {
  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
