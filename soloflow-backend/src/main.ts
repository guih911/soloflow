import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3001'];
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Rate Limiting global
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RateLimitGuard(reflector));

  // Headers de segurança (LGPD/Segurança)
  app.use((req, res, next) => {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevenir XSS
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevenir MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
    );

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    // Cache Control para dados sensíveis
    if (req.path.includes('/auth/') || req.path.includes('/users/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // HSTS - Forçar HTTPS em produção
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    next();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`🔒 Headers de segurança LGPD habilitados`);
  console.log(`⚡ Rate limiting ativo`);
}
bootstrap();

