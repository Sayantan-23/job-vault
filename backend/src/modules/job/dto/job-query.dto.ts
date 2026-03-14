import { IsOptional, IsString, IsEnum, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { JobStatus } from '../enums/job-status.enum.js';

export class JobQueryDto extends PaginationQueryDto {
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
