import { IsUrl } from 'class-validator';

export class CreateJobFromUrlDto {
  @IsUrl()
  sourceUrl!: string;
}
