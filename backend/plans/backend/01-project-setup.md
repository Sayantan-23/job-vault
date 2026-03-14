# Backend Plan 01 — Project Setup

## Overview

Initialize the NestJS application with MikroORM + PostgreSQL, Docker configuration, global pipes/filters/interceptors, base entity class, pagination DTOs, and all foundational infrastructure. Everything built here is consumed by every subsequent backend plan.

---

## Dependencies

```bash
# Create NestJS app
npx @nestjs/cli new backend

# Inside backend/
npm install @mikro-orm/core @mikro-orm/nestjs @mikro-orm/postgresql @mikro-orm/migrations @mikro-orm/cli
npm install @nestjs/config class-validator class-transformer
npm install helmet
npm install uuid
npm install -D @types/uuid
```

---

## Folder / File Structure

```
backend/
├── src/
│   ├── main.ts                       # Bootstrap with global pipes, CORS, helmet
│   ├── app.module.ts                 # Root module
│   ├── common/
│   │   ├── entities/
│   │   │   └── base.entity.ts        # Abstract base entity (id, createdAt, updatedAt)
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts     # PaginationQueryDto (page, limit, sortBy, sortOrder)
│   │   │   └── paginated-response.dto.ts  # PaginatedResponse<T>
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   # Global exception filter (consistent error format)
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts   # Response wrapper interceptor
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts         # Global validation pipe config
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts  # @CurrentUser() param decorator (stub for Plan 02)
│   │   └── guards/
│   │       └── (placeholder for Plan 02)
│   ├── config/
│   │   ├── mikro-orm.config.ts       # MikroORM configuration
│   │   ├── app.config.ts             # App configuration (port, cors origins, etc.)
│   │   └── validation.ts             # Environment validation schema
│   └── modules/
│       └── (placeholder directories for future modules)
├── mikro-orm.config.ts               # Root-level MikroORM CLI config (re-exports)
├── test/
│   ├── jest-e2e.json
│   └── app.e2e-spec.ts
├── .env.example                      # Environment variable template
├── .env                              # Local environment (gitignored)
├── Dockerfile                        # Multi-stage Docker build
├── .dockerignore
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
└── package.json
```

---

## Entity Definitions

### `base.entity.ts`

```typescript
import { PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

export abstract class BaseEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = v4();

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
```

---

## DTO Definitions

### `pagination.dto.ts`

```typescript
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

### `paginated-response.dto.ts`

```typescript
export class PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

---

## Global Pipes / Filters / Interceptors

### `http-exception.filter.ts`
```typescript
// Catches all HttpExceptions and formats response as:
// {
//   statusCode: number,
//   message: string | string[],
//   error: string,
//   timestamp: string,
//   path: string
// }
```

### `transform.interceptor.ts`
```typescript
// Wraps successful responses in:
// {
//   data: <response>,
//   statusCode: number
// }
// Excludes file download responses (Blob/Stream)
```

### `validation.pipe.ts`
```typescript
// Global ValidationPipe configured with:
// - whitelist: true (strip unknown properties)
// - forbidNonWhitelisted: true
// - transform: true (auto-transform to DTO types)
// - transformOptions: { enableImplicitConversion: true }
```

---

## MikroORM Configuration

### `config/mikro-orm.config.ts`

```typescript
import { defineConfig } from '@mikro-orm/postgresql';

export default defineConfig({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  dbName: process.env.DB_NAME || 'jobvault',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
  },
  debug: process.env.NODE_ENV !== 'production',
});
```

---

## App Configuration

### `config/app.config.ts`

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080'],
  },
  nodeEnv: process.env.NODE_ENV || 'development',
});
```

---

## Environment Variables

### `.env.example`

```env
# App
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=jobvault

# JWT (Plan 02)
JWT_SECRET=change-me-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth (Plan 02)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Cloudinary (Plan 06)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Gemini AI (Plan 07)
GEMINI_API_KEY=
```

---

## Docker

### `Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
```

---

## Root `docker-compose.yml`

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: jobvault
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file: ./backend/.env
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "8080:8080"
    depends_on:
      - backend

volumes:
  pgdata:
```

---

## main.ts Bootstrap

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

---

## Step-by-Step Implementation Order

1. **Create NestJS project** — `npx @nestjs/cli new backend`
2. **Install dependencies** — MikroORM, config, class-validator, helmet
3. **Create `.env.example` and `.env`** — Environment variables
4. **Configure `config/mikro-orm.config.ts`** — Database connection
5. **Configure `config/app.config.ts`** — App settings
6. **Set up `app.module.ts`** — Import MikroOrmModule, ConfigModule
7. **Create `common/entities/base.entity.ts`** — Abstract base entity
8. **Create `common/dto/pagination.dto.ts`** — Pagination query DTO
9. **Create `common/dto/paginated-response.dto.ts`** — Paginated response wrapper
10. **Create `common/filters/http-exception.filter.ts`** — Global exception filter
11. **Create `common/interceptors/transform.interceptor.ts`** — Response wrapper
12. **Update `main.ts`** — Global prefix, CORS, helmet, validation pipe, filters, interceptors
13. **Create `Dockerfile`** and `.dockerignore`
14. **Create root `docker-compose.yml`**
15. **Run initial migration** — `npx mikro-orm migration:create --initial`
16. **Verify** — `npm run start:dev`, health check, database connection

---

## Testing Strategy

### Unit Tests (Jest)
- `PaginationQueryDto`: validates defaults, rejects invalid values
- `PaginatedResponse`: calculates totalPages correctly
- `HttpExceptionFilter`: formats error responses consistently
- `TransformInterceptor`: wraps responses in data envelope

### E2E Tests (Supertest)
- `GET /api` or health endpoint returns 200
- Invalid route returns 404 with formatted error
- Validation error returns 400 with field-level errors
- CORS headers present for allowed origins

---

## Acceptance Criteria

- [ ] NestJS app starts with `npm run start:dev`
- [ ] MikroORM connects to PostgreSQL
- [ ] Global validation pipe strips unknown properties and validates DTOs
- [ ] Global exception filter returns consistent error format
- [ ] Response interceptor wraps data in envelope
- [ ] `/api` prefix applied to all routes
- [ ] CORS configured for frontend origin
- [ ] Helmet security headers applied
- [ ] Docker Compose starts PostgreSQL + backend + frontend
- [ ] `.env.example` documents all required environment variables
- [ ] Base entity provides id (UUID), createdAt, updatedAt
- [ ] Pagination DTO validates page/limit/sort parameters
- [ ] ESLint + Prettier pass on all files
