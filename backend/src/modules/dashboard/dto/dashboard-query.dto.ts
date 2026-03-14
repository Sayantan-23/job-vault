import { IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { JobStatus } from '../../job/enums/job-status.enum.js';

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsIn(['all', 'active', 'stale', 'ghost'])
  ghostFilter?: string;
}
