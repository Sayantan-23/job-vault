import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class NotificationQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;
}
