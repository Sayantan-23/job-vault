import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTimelineEventDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
