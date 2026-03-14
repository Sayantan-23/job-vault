import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';

const BCRYPT_SALT_ROUNDS = 12;

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // 1. Check email uniqueness
    const existingUser = await this.em.findOne(User, { email: dto.email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hash password with bcrypt (salt rounds: 12)
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // 3. Create user entity
    const user = this.em.create(User, {
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    // 4. Generate access + refresh tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // 5. Store refresh token hash
    user.refreshTokenHash = await this.hashToken(refreshToken);

    // 6. Persist and return
    await this.em.persistAndFlush(user);

    return { accessToken, refreshToken, user };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // 1. Find user by email
    const user = await this.em.findOne(User, { email: dto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Verify password with bcrypt
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google login. Please sign in with Google.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Generate access + refresh tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // 4. Store refresh token hash
    user.refreshTokenHash = await this.hashToken(refreshToken);
    await this.em.flush();

    // 5. Return tokens + user
    return { accessToken, refreshToken, user };
  }

  async refreshTokens(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify refresh token JWT
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_SECRET || 'your-jwt-secret-here',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Find user by id from token payload
    const user = await this.em.findOne(User, { id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 3. Compare refresh token hash
    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const isTokenValid = await this.compareToken(
      dto.refreshToken,
      user.refreshTokenHash,
    );
    if (!isTokenValid) {
      // Possible token reuse attack - clear stored hash (force re-login)
      user.refreshTokenHash = undefined;
      await this.em.flush();
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please log in again.',
      );
    }

    // 4. Generate new access + refresh tokens (ROTATION)
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // 5. Store new refresh token hash
    user.refreshTokenHash = await this.hashToken(refreshToken);
    await this.em.flush();

    // 6. Return new tokens
    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    // 1. Clear refresh token hash from user
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.refreshTokenHash = undefined;
    await this.em.flush();
  }

  async googleLogin(googleUser: GoogleProfile): Promise<AuthResponseDto> {
    // 1. Find or create user by googleId
    let user = await this.em.findOne(User, { googleId: googleUser.googleId });

    if (!user) {
      // Check if user already exists with same email (link accounts)
      user = await this.em.findOne(User, { email: googleUser.email });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleUser.googleId;
        user.isEmailVerified = true;
      } else {
        // 2. Create new user with Google profile data
        user = this.em.create(User, {
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.googleId,
          isEmailVerified: true,
        });
        this.em.persist(user);
      }
    } else {
      // 3. Update name if changed
      if (googleUser.name && googleUser.name !== user.name) {
        user.name = googleUser.name;
      }
    }

    // 4. Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Store refresh token hash
    user.refreshTokenHash = await this.hashToken(refreshToken);
    await this.em.flush();

    // 5. Return tokens + user
    return { accessToken, refreshToken, user };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.preferences !== undefined) {
      user.preferences = dto.preferences;
    }

    if (dto.masterProfileJson !== undefined) {
      user.masterProfileJson = dto.masterProfileJson;
    }

    await this.em.flush();
    return user;
  }

  private generateAccessToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any,
    });
  }

  private generateRefreshToken(user: User): string {
    const payload = { sub: user.id };
    return this.jwtService.sign(payload, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any,
    });
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, BCRYPT_SALT_ROUNDS);
  }

  private async compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }
}
