// src/common/guards/rate-limit.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Armazenamento em memória para rate limiting
// Em produção, considere usar Redis para ambiente distribuído
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Decorator para configurar rate limit por rota
export const RATE_LIMIT_KEY = 'rateLimit';
export interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  max: number; // Máximo de requisições na janela
}

export const RateLimit = (config: RateLimitConfig) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, config, descriptor?.value || target);
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Configuração padrão
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 requisições por minuto
  };

  // Configurações específicas para rotas sensíveis
  private readonly sensitiveRoutes: Record<string, RateLimitConfig> = {
    '/auth/login': { windowMs: 15 * 60 * 1000, max: 5 }, // 5 tentativas em 15 minutos
    '/auth/register': { windowMs: 60 * 60 * 1000, max: 3 }, // 3 registros por hora
    '/auth/forgot-password': { windowMs: 60 * 60 * 1000, max: 3 }, // 3 por hora
    '/lgpd/deletion/request': { windowMs: 24 * 60 * 60 * 1000, max: 1 }, // 1 por dia
  };

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Obter IP do cliente
    const clientIp = this.getClientIp(request);
    const path = request.path;

    // Verificar configuração por decorator
    const handler = context.getHandler();
    const decoratorConfig = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      handler,
    );

    // Determinar configuração a usar
    const config =
      decoratorConfig ||
      this.sensitiveRoutes[path] ||
      this.defaultConfig;

    // Gerar chave única para o rate limit
    const key = `${clientIp}:${path}`;
    const now = Date.now();

    // Obter ou criar entrada no store
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Nova janela de tempo
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Incrementar contador
      entry.count++;
    }

    // Calcular headers de rate limit
    const remaining = Math.max(0, config.max - entry.count);
    const resetTime = Math.ceil((entry.resetTime - now) / 1000);

    // Definir headers de rate limit
    response.setHeader('X-RateLimit-Limit', config.max);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetTime);

    // Verificar se excedeu o limite
    if (entry.count > config.max) {
      response.setHeader('Retry-After', resetTime);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Muitas requisições. Por favor, aguarde antes de tentar novamente.',
          error: 'Too Many Requests',
          retryAfter: resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getClientIp(request: any): string {
    // Tentar obter IP real do cliente (considerando proxies)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}

// Limpeza periódica do store (executar a cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
