import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import session from 'express-session';
import { AppModule } from './app.module';
import { getAllowedOrigins } from './config/origin.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'default-secret-do-not-use-in-prod',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // true in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if extra properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3004);
}
bootstrap();
