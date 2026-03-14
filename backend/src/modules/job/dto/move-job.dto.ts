import { IsEnum, IsNumber } from 'class-validator';
import { JobStatus } from '../enums/job-status.enum.js';

export class MoveJobDto {
  @IsEnum(JobStatus)
  status!: JobStatus;

  @IsNumber()
  kanbanOrder!: number;
}
