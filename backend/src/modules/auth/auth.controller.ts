import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { User } from './entities/user.entity.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Public - Register new user with email/password
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * POST /api/auth/login
   * Public - Login with email/password
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/refresh
   * Public - Rotate access + refresh tokens
   */
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  /**
   * POST /api/auth/logout
   * Authenticated - Invalidate refresh token
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * GET /api/auth/google
   * Public - Initiates Google OAuth flow (redirects to Google)
   */
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // Guard handles redirect to Google
  }

  /**
   * GET /api/auth/google/callback
   * Public - Handles Google OAuth callback, redirects to frontend with tokens
   */
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user as any);

    const frontendUrl =
      process.env.CORS_ORIGINS?.split(',')[0] || 'http://localhost:8080';
    const redirectUrl = new URL('/auth/google/callback', frontendUrl);
    redirectUrl.searchParams.set('accessToken', result.accessToken);
    redirectUrl.searchParams.set('refreshToken', result.refreshToken);

    res.redirect(redirectUrl.toString());
  }

  /**
   * GET /api/auth/me
   * Authenticated - Returns current user profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: User) {
    return user;
  }

  /**
   * PATCH /api/auth/profile
   * Authenticated - Update user profile
   */
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }
}
