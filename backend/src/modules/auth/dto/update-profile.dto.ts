import { IsOptional, IsString, IsObject, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsObject()
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultView?: 'kanban' | 'list';
  };

  @IsOptional()
  @IsObject()
  masterProfileJson?: Record<string, any>;
}
