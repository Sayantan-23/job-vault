import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(createValidationPipe());

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
