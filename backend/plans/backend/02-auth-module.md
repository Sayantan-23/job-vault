# Backend Plan 02 — Auth Module

## Overview

Implement the authentication system: User entity, JWT strategy with access + refresh token rotation, Google OAuth via Passport.js, auth guards, and the `@CurrentUser()` parameter decorator. This module handles user registration, login, token refresh, logout, and profile management.

---

## Dependencies

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-google-oauth20
npm install bcrypt
npm install -D @types/bcrypt @types/passport-jwt @types/passport-google-oauth20
```

---

## Folder / File Structure

```
backend/src/modules/auth/
├── auth.module.ts                    # AuthModule with JWT, Passport imports
├── auth.controller.ts                # Auth routes (register, login, refresh, google, profile)
├── auth.service.ts                   # Auth business logic
├── entities/
│   └── user.entity.ts                # User entity
├── dto/
│   ├── register.dto.ts               # RegisterDto (name, email, password)
│   ├── login.dto.ts                  # LoginDto (email, password)
│   ├── refresh-token.dto.ts          # RefreshTokenDto (refreshToken)
│   ├── update-profile.dto.ts         # UpdateProfileDto (name, preferences, masterProfileJson)
│   └── auth-response.dto.ts          # AuthResponseDto (accessToken, refreshToken, user)
├── strategies/
│   ├── jwt.strategy.ts               # JWT access token strategy
│   └── google.strategy.ts            # Google OAuth strategy
├── guards/
│   ├── jwt-auth.guard.ts             # JWT authentication guard
│   └── google-auth.guard.ts          # Google OAuth guard
└── decorators/
    └── current-user.decorator.ts     # @CurrentUser() param decorator
```

---

## Entity Definition

### `user.entity.ts`

```typescript
import { Entity, Property, Unique, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property()
  name: string;

  @Property()
  @Unique()
  email: string;

  @Property({ nullable: true, hidden: true })
  passwordHash?: string;

  @Property({ nullable: true })
  @Unique()
  googleId?: string;

  @Property({ default: false })
  isEmailVerified: boolean = false;

  @Property({ nullable: true })
  masterResumeUrl?: string;

  @Property({ type: 'json', nullable: true })
  masterProfileJson?: Record<string, any>;

  @Property({ type: 'json', nullable: true })
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultView?: 'kanban' | 'list';
  };

  @Property({ nullable: true, hidden: true })
  refreshTokenHash?: string;
}
```

### Migration: `CreateUsersTable`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  master_resume_url VARCHAR(500),
  master_profile_json JSONB,
  preferences JSONB,
  refresh_token_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## DTO Definitions

### `register.dto.ts`
```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
```

### `login.dto.ts`
```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

### `refresh-token.dto.ts`
```typescript
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
```

### `update-profile.dto.ts`
```typescript
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
```

---

## API Endpoints

| Method | Path | Auth | Request | Response | Description |
|--------|------|------|---------|----------|-------------|
| POST | `/api/auth/register` | No | `RegisterDto` | `AuthResponseDto` | Register new user |
| POST | `/api/auth/login` | No | `LoginDto` | `AuthResponseDto` | Login with email/password |
| POST | `/api/auth/refresh` | No | `RefreshTokenDto` | `{ accessToken, refreshToken }` | Rotate tokens |
| POST | `/api/auth/logout` | Yes | `RefreshTokenDto` | `{ message }` | Invalidate refresh token |
| GET | `/api/auth/google` | No | — | Redirect | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | No | `?code=` | Redirect with tokens | Google OAuth callback |
| GET | `/api/auth/me` | Yes | — | `User` | Get current user profile |
| PATCH | `/api/auth/profile` | Yes | `UpdateProfileDto` | `User` | Update profile |

---

## Service: `auth.service.ts`

```typescript
export class AuthService {
  // Registration
  async register(dto: RegisterDto): Promise<AuthResponseDto>;
    // 1. Check email uniqueness
    // 2. Hash password with bcrypt (salt rounds: 12)
    // 3. Create user entity
    // 4. Generate access + refresh tokens
    // 5. Store refresh token hash
    // 6. Return tokens + user

  // Login
  async login(dto: LoginDto): Promise<AuthResponseDto>;
    // 1. Find user by email
    // 2. Verify password with bcrypt
    // 3. Generate access + refresh tokens
    // 4. Store refresh token hash
    // 5. Return tokens + user

  // Token refresh
  async refreshTokens(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }>;
    // 1. Verify refresh token JWT
    // 2. Find user by id from token payload
    // 3. Compare refresh token hash
    // 4. Generate new access + refresh tokens (ROTATION)
    // 5. Store new refresh token hash
    // 6. Return new tokens

  // Logout
  async logout(userId: string): Promise<void>;
    // 1. Clear refresh token hash from user

  // Google OAuth
  async googleLogin(googleUser: GoogleProfile): Promise<AuthResponseDto>;
    // 1. Find or create user by googleId
    // 2. If new: create user with Google profile data
    // 3. If existing: update name if changed
    // 4. Generate tokens
    // 5. Return tokens + user

  // Profile
  async getProfile(userId: string): Promise<User>;
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User>;

  // Token helpers
  private generateAccessToken(user: User): string;
    // Payload: { sub: user.id, email: user.email }
    // Expiry: JWT_ACCESS_EXPIRY (default 15m)

  private generateRefreshToken(user: User): string;
    // Payload: { sub: user.id }
    // Expiry: JWT_REFRESH_EXPIRY (default 7d)

  private async hashToken(token: string): Promise<string>;
  private async compareToken(token: string, hash: string): Promise<boolean>;
}
```

---

## JWT Strategy

### `jwt.strategy.ts`
```typescript
// Passport JWT strategy
// Extracts token from: Authorization: Bearer <token>
// Validates: not expired, signature valid
// Payload → user lookup by id
// Returns user object (attached to request)
```

### Token payload structure:
```typescript
interface JwtPayload {
  sub: string;    // user ID
  email: string;
  iat: number;
  exp: number;
}
```

---

## Google OAuth Strategy

### `google.strategy.ts`
```typescript
// Passport Google OAuth 2.0 strategy
// Scopes: ['email', 'profile']
// Callback URL: GOOGLE_CALLBACK_URL
// On validate: extract { googleId, email, name, picture }
// Controller callback → AuthService.googleLogin()
// Redirect to frontend with tokens as query params:
//   ${FRONTEND_URL}/auth/google/callback?accessToken=...&refreshToken=...
```

---

## Guards

### `jwt-auth.guard.ts`
```typescript
// Extends AuthGuard('jwt')
// Applied to protected routes
// Returns 401 if token invalid/missing
```

### `google-auth.guard.ts`
```typescript
// Extends AuthGuard('google')
// Applied to Google OAuth routes
```

---

## Decorator

### `current-user.decorator.ts`
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Usage: @CurrentUser() user: User
// Usage: @CurrentUser('id') userId: string
```

---

## Refresh Token Rotation Flow

1. Client sends refresh token to `POST /auth/refresh`
2. Server verifies JWT signature + expiry
3. Server compares token hash with stored hash
4. If valid: generate NEW access + refresh tokens
5. Store NEW refresh token hash (old one invalidated)
6. Return new tokens
7. If invalid/mismatched: clear stored hash (force re-login on all devices)

This prevents refresh token reuse attacks.

---

## Step-by-Step Implementation Order

1. **Create `user.entity.ts`** — User entity with all fields
2. **Create migration** — `CreateUsersTable`
3. **Create DTOs** — register, login, refresh, update-profile, auth-response
4. **Create `jwt.strategy.ts`** — JWT access token validation
5. **Create `jwt-auth.guard.ts`** — JWT guard
6. **Create `current-user.decorator.ts`** — @CurrentUser decorator
7. **Create `auth.service.ts`** — Registration, login, token management
8. **Create `auth.controller.ts`** — All auth routes
9. **Create `google.strategy.ts`** — Google OAuth strategy
10. **Create `google-auth.guard.ts`** — Google OAuth guard
11. **Create `auth.module.ts`** — Wire up module with JwtModule, PassportModule
12. **Register AuthModule in AppModule**
13. **Test registration flow** — POST /auth/register → tokens returned
14. **Test login flow** — POST /auth/login → tokens returned
15. **Test token refresh** — POST /auth/refresh → new tokens (rotation)
16. **Test protected route** — GET /auth/me with valid/invalid token
17. **Test Google OAuth** — Full redirect flow (requires Google credentials)

---

## Testing Strategy

### Unit Tests (Jest)
- `AuthService.register`: creates user, hashes password, returns tokens
- `AuthService.register`: rejects duplicate email
- `AuthService.login`: validates correct password, rejects wrong password
- `AuthService.login`: rejects non-existent email
- `AuthService.refreshTokens`: rotates tokens, invalidates old refresh token
- `AuthService.refreshTokens`: rejects reused refresh token
- `AuthService.googleLogin`: creates new user for new googleId
- `AuthService.googleLogin`: finds existing user for known googleId
- `JwtStrategy`: validates token payload, rejects expired tokens

### E2E Tests (Supertest)
- `POST /api/auth/register` — success with valid data, 409 with duplicate email
- `POST /api/auth/login` — success with valid credentials, 401 with invalid
- `POST /api/auth/refresh` — returns new tokens, rejects invalid refresh token
- `POST /api/auth/logout` — invalidates refresh token
- `GET /api/auth/me` — returns user with valid token, 401 without
- `PATCH /api/auth/profile` — updates name, returns updated user

---

## Acceptance Criteria

- [ ] User registration creates account and returns JWT tokens
- [ ] Duplicate email registration returns 409
- [ ] Password is hashed with bcrypt before storage
- [ ] Login with valid credentials returns JWT tokens
- [ ] Login with invalid credentials returns 401
- [ ] Access token expires after configured time (default 15m)
- [ ] Refresh token rotation: new tokens issued, old invalidated
- [ ] Reused refresh token triggers full invalidation (security)
- [ ] Logout clears refresh token hash
- [ ] Google OAuth: redirects to Google, callback creates/finds user
- [ ] Google OAuth: returns tokens via frontend redirect
- [ ] `@CurrentUser()` decorator extracts user from JWT in request
- [ ] `JwtAuthGuard` returns 401 for missing/invalid tokens
- [ ] GET /auth/me returns current user profile (excludes passwordHash)
- [ ] PATCH /auth/profile updates user fields
- [ ] All password-related fields are hidden from API responses
