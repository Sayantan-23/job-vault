# Backend Plan 08 — Extension API

## Overview

Implement the API key authentication system and endpoints for the Chrome Extension. This includes the ApiKey entity, API key generation/management, a dedicated auth guard for API key authentication, quick job creation endpoint, and duplicate URL detection. The extension uses `X-API-Key` header authentication instead of JWT.

---

## Dependencies

```bash
npm install crypto  # Built-in Node.js, for key generation + hashing
# No additional npm packages needed
```

---

## Folder / File Structure

```
backend/src/modules/extension/
├── extension.module.ts               # ExtensionModule
├── extension.controller.ts           # Extension API routes
├── extension.service.ts              # Extension business logic
├── entities/
│   └── api-key.entity.ts             # ApiKey entity
├── dto/
│   ├── create-api-key.dto.ts         # Create API key request
│   ├── quick-create-job.dto.ts       # Quick job creation from extension
│   └── check-url-query.dto.ts        # URL check query
├── guards/
│   └── api-key.guard.ts              # X-API-Key authentication guard
└── decorators/
    └── api-key-user.decorator.ts     # @ApiKeyUser() param decorator
```

---

## Entity Definition

### `api-key.entity.ts`

```typescript
import { Entity, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../auth/entities/user.entity';

@Entity({ tableName: 'api_keys' })
export class ApiKey extends BaseEntity {
  @ManyToOne(() => User)
  user: User;

  @Property({ hidden: true })
  keyHash: string;

  @Property()
  name: string;  // User-defined name, e.g. "Chrome Extension"

  @Property({ nullable: true, type: 'timestamptz' })
  lastUsedAt?: Date;

  @Property({ default: true })
  isActive: boolean = true;

  // Key prefix stored for identification (first 8 chars)
  @Property()
  keyPrefix: string;
}
```

### Migration: `CreateApiKeysTable`
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

---

## DTO Definitions

### `create-api-key.dto.ts`
```typescript
import { IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(100)
  name: string;
}
```

### `quick-create-job.dto.ts`
```typescript
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class QuickCreateJobDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  company: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salaryRange?: string;

  @IsUrl()
  sourceUrl: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### `check-url-query.dto.ts`
```typescript
import { IsUrl } from 'class-validator';

export class CheckUrlQueryDto {
  @IsUrl()
  url: string;
}
```

---

## API Endpoints

| Method | Path | Auth | Request | Response | Description |
|--------|------|------|---------|----------|-------------|
| POST | `/api/auth/api-keys` | JWT | `CreateApiKeyDto` | `{ key, apiKey }` | Create new API key (returns raw key ONCE) |
| GET | `/api/auth/api-keys` | JWT | — | `ApiKey[]` | List user's API keys |
| DELETE | `/api/auth/api-keys/:id` | JWT | — | `{ message }` | Revoke API key |
| POST | `/api/extension/verify-key` | API Key | — | `{ valid, userName }` | Verify API key |
| POST | `/api/extension/jobs` | API Key | `QuickCreateJobDto` | `QuickCreateJobResponse` | Quick create job |
| GET | `/api/extension/check-url` | API Key | Query: `url` | `{ exists, jobId? }` | Check if URL already saved |

Note: API key management routes (`/auth/api-keys/*`) use JWT auth (from the web app).
Extension routes (`/extension/*`) use API key auth (from the extension).

---

## API Key Guard: `api-key.guard.ts`

```typescript
import { CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';

export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // 1. Hash the provided key
    // 2. Look up by hash in api_keys table
    // 3. Verify isActive = true
    // 4. Update lastUsedAt
    // 5. Attach user to request
    // 6. Return true or throw UnauthorizedException
  }
}
```

---

## Service: `extension.service.ts`

```typescript
import { randomBytes, createHash } from 'crypto';

export class ExtensionService {
  // API Key Management
  async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<{ key: string; apiKey: ApiKey }>;
    // 1. Generate random key: `jv_${randomBytes(32).toString('hex')}` (prefix: "jv_")
    // 2. Hash key with SHA-256
    // 3. Store hash + name + key prefix (first 8 chars)
    // 4. Return raw key (ONLY time it's shown) + ApiKey entity
    // WARNING: Raw key cannot be retrieved later — user must save it

  async listApiKeys(userId: string): Promise<ApiKey[]>;
    // Returns all keys (hash hidden, shows prefix + name + lastUsedAt)

  async revokeApiKey(id: string, userId: string): Promise<void>;
    // Set isActive = false (soft delete for audit trail)

  async validateApiKey(rawKey: string): Promise<User>;
    // 1. Hash the raw key
    // 2. Find ApiKey by hash
    // 3. Check isActive
    // 4. Update lastUsedAt
    // 5. Return associated User

  // Extension Operations
  async quickCreateJob(userId: string, dto: QuickCreateJobDto): Promise<QuickCreateJobResponse>;
    // 1. Normalize URL (remove tracking params, fragments)
    // 2. Check for duplicate (same normalized URL for this user)
    // 3. If duplicate: return { isDuplicate: true, id, message }
    // 4. If new: create job in Wishlist status
    //    - If description provided: convert to markdown, store as snapshot
    //    - Set sourceUrl to normalized URL
    //    - Create auto timeline entry: "Added via Chrome Extension"
    // 5. Return { id, title, company, status, isDuplicate: false }

  async checkUrl(userId: string, url: string): Promise<{ exists: boolean; jobId?: string }>;
    // 1. Normalize URL
    // 2. Search jobs by normalized sourceUrl
    // 3. Return { exists, jobId }

  // URL Normalization
  private normalizeUrl(url: string): string;
    // 1. Parse URL
    // 2. Remove common tracking params: utm_*, fbclid, gclid, ref, etc.
    // 3. Remove fragment (#...)
    // 4. Remove trailing slashes
    // 5. Lowercase hostname
    // 6. Sort query params alphabetically
    // 7. Return normalized URL string
}
```

---

## URL Normalization

```typescript
// URL normalization ensures duplicate detection works even with tracking parameters.
// Examples:
// "https://linkedin.com/jobs/view/123?utm_source=google&fbclid=abc"
//   → "https://linkedin.com/jobs/view/123"
// "https://indeed.com/viewjob?jk=abc123&from=serp"
//   → "https://indeed.com/viewjob?jk=abc123"

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'from', 'source', 'si', 'igsh',
];
```

---

## Quick Create Job Response

```typescript
interface QuickCreateJobResponse {
  id: string;
  title: string;
  company: string;
  status: string;
  isDuplicate: boolean;
  message?: string;  // "Already saved" or "Saved to Wishlist"
}
```

---

## Decorator: `api-key-user.decorator.ts`

```typescript
// Similar to @CurrentUser() but for API key auth
// Extracts user from request (attached by ApiKeyGuard)
export const ApiKeyUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

---

## Step-by-Step Implementation Order

1. **Create `api-key.entity.ts`** — ApiKey entity
2. **Create migration** — `CreateApiKeysTable`
3. **Create DTOs** — create-api-key, quick-create-job, check-url-query
4. **Create `api-key.guard.ts`** — X-API-Key authentication guard
5. **Create `api-key-user.decorator.ts`** — Parameter decorator
6. **Create `extension.service.ts`** — API key management + quick create + URL normalization
7. **Create `extension.controller.ts`** — All extension routes
8. **Create `extension.module.ts`** — Wire up module
9. **Add API key management routes to AuthController** (or separate controller)
10. **Register ExtensionModule in AppModule**
11. **Test API key creation** — Generate key, verify hash stored
12. **Test API key validation** — Correct key passes, invalid rejected
13. **Test quick create** — Job created in Wishlist
14. **Test duplicate detection** — Same URL returns isDuplicate: true
15. **Test URL normalization** — Various URLs with tracking params

---

## Testing Strategy

### Unit Tests (Jest)
- `ExtensionService.createApiKey`: generates key with "jv_" prefix, stores hash
- `ExtensionService.validateApiKey`: finds key by hash, rejects inactive keys
- `ExtensionService.quickCreateJob`: creates job, detects duplicates
- `ExtensionService.normalizeUrl`: removes tracking params, normalizes format
- `ExtensionService.checkUrl`: returns true for existing URL, false for new
- `ApiKeyGuard`: extracts key from header, validates, attaches user
- `ApiKeyGuard`: rejects missing key, invalid key, inactive key

### E2E Tests (Supertest)
- `POST /api/auth/api-keys` — creates key, returns raw key (JWT auth)
- `GET /api/auth/api-keys` — lists keys without raw values (JWT auth)
- `DELETE /api/auth/api-keys/:id` — deactivates key (JWT auth)
- `POST /api/extension/verify-key` — validates key (API key auth)
- `POST /api/extension/verify-key` with invalid key — 401
- `POST /api/extension/jobs` — creates job (API key auth)
- `POST /api/extension/jobs` duplicate URL — returns isDuplicate: true
- `GET /api/extension/check-url?url=...` — checks existence
- Deactivated key — all extension endpoints return 401

---

## Acceptance Criteria

- [ ] API key generation returns raw key (shown once, not retrievable)
- [ ] API key format: `jv_` prefix + 64 hex chars
- [ ] API key stored as SHA-256 hash (raw key never stored)
- [ ] API key list shows prefix + name + last used (not raw key)
- [ ] API key can be revoked (soft delete)
- [ ] `X-API-Key` header authentication works for extension endpoints
- [ ] Invalid/missing API key returns 401
- [ ] Revoked API key returns 401
- [ ] Quick create adds job to Wishlist
- [ ] Quick create with description stores as markdown snapshot
- [ ] Duplicate detection by normalized URL works
- [ ] URL normalization removes tracking parameters
- [ ] `lastUsedAt` updates on each API key use
- [ ] Auto timeline entry created: "Added via Chrome Extension"
- [ ] API key management requires JWT auth (web app only)
- [ ] Extension endpoints require API key auth (extension only)
