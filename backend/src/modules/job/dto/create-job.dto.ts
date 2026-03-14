import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum.js';

export class CreateJobDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(255)
  company!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salaryRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  snapshotMarkdown?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
