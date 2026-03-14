import { User } from '../entities/user.entity.js';

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: User;
}
