import { IsString, IsDateString, MaxLength } from 'class-validator';

export class CreateReminderDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsDateString()
  remindAt!: string;
}
