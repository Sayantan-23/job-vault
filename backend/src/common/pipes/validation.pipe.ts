import { ValidationPipe } from '@nestjs/common';

/**
 * Factory function that returns a configured global ValidationPipe.
 * Used in main.ts bootstrap.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}
