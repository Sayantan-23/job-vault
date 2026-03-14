import { IsOptional, IsString, IsDateString, IsBoolean, MaxLength } from 'class-validator';

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsDateString()
  remindAt?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
