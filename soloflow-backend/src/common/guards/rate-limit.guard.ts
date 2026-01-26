// src/common/guards/rate-limit.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../modules/cache/cache.service';

// Armazenamento em memória para fallback quando Redis não está disponível
const MAX_STORE_ENTRIES = 10000;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Referência para o interval de limpeza (gerenciado pelo guard)
let cleanupIntervalRef: NodeJS.Timeout | null = null;
let guardInstanceCount = 0;

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
export class RateLimitGuard implements CanActivate, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitGuard.name);
  private useRedis = false;

  // Configuração padrão (uso intensivo — usuários experientes trabalhando 8h/dia)
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minuto
    max: 300, // 300 requisições por minuto
  };

  // Configurações específicas para rotas sensíveis
  private readonly sensitiveRoutes: Record<string, RateLimitConfig> = {
    '/auth/login': { windowMs: 15 * 60 * 1000, max: 15 }, // 15 tentativas em 15 minutos
    '/auth/register': { windowMs: 60 * 60 * 1000, max: 10 }, // 10 registros por hora
    '/auth/forgot-password': { windowMs: 60 * 60 * 1000, max: 5 }, // 5 por hora
    '/lgpd/deletion/request': { windowMs: 24 * 60 * 60 * 1000, max: 3 }, // 3 por dia
    '/signatures/sign': { windowMs: 15 * 60 * 1000, max: 50 }, // 50 assinaturas em 15 minutos
    '/signatures/request-otp': { windowMs: 15 * 60 * 1000, max: 15 }, // 15 OTPs em 15 minutos
  };

  constructor(
    private reflector: Reflector,
    @Optional() @Inject(CacheService) private cacheService?: CacheService,
  ) {}

  async onModuleInit() {
    guardInstanceCount++;

    // Verificar se Redis está disponível
    if (this.cacheService) {
      try {
        this.useRedis = await this.cacheService.isRedisAvailable();
        if (this.useRedis) {
          this.logger.log('✅ Rate limiting usando Redis (distribuído)');
        } else {
          this.logger.warn('⚠️ Redis não disponível, usando rate limit em memória');
        }
      } catch {
        this.useRedis = false;
        this.logger.warn('⚠️ Erro ao verificar Redis, usando rate limit em memória');
      }
    }

    // Iniciar intervalo de limpeza para o fallback em memória (apenas se não usar Redis)
    if (!this.useRedis && !cleanupIntervalRef) {
      cleanupIntervalRef = setInterval(() => {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, value] of rateLimitStore.entries()) {
          if (now > value.resetTime) {
            rateLimitStore.delete(key);
            cleaned++;
          }
        }
        if (cleaned > 0) {
          this.logger.debug(`Rate limit cleanup: ${cleaned} entradas expiradas removidas`);
        }
      }, 5 * 60 * 1000); // 5 minutos
      this.logger.log('Rate limit cleanup interval iniciado (memória)');
    }
  }

  onModuleDestroy() {
    guardInstanceCount--;
    if (guardInstanceCount <= 0 && cleanupIntervalRef) {
      clearInterval(cleanupIntervalRef);
      cleanupIntervalRef = null;
      rateLimitStore.clear();
      this.logger.log('Rate limit cleanup interval encerrado');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const now = Date.now();
    let entry: { count: number; resetTime: number };

    // Usar Redis se disponível, senão fallback para memória
    if (this.useRedis && this.cacheService) {
      entry = await this.getRateLimitFromRedis(clientIp, path, config.windowMs);
    } else {
      entry = this.getRateLimitFromMemory(clientIp, path, config.windowMs, now);
    }

    // Calcular headers de rate limit
    const remaining = Math.max(0, config.max - entry.count);
    const resetTime = Math.ceil((entry.resetTime - now) / 1000);

    // Definir headers de rate limit
    response.setHeader('X-RateLimit-Limit', config.max);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.max(0, resetTime));
    response.setHeader('X-RateLimit-Policy', this.useRedis ? 'redis' : 'memory');

    // Verificar se excedeu o limite
    if (entry.count > config.max) {
      response.setHeader('Retry-After', Math.max(1, resetTime));

      const timeMessage = this.formatRetryTime(Math.max(1, resetTime));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Limite de requisições atingido. Tente novamente em ${timeMessage}.`,
          error: 'Too Many Requests',
          retryAfter: Math.max(1, resetTime),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Obtém rate limit do Redis (distribuído)
   */
  private async getRateLimitFromRedis(
    clientIp: string,
    path: string,
    windowMs: number,
  ): Promise<{ count: number; resetTime: number }> {
    try {
      return await this.cacheService!.incrementRateLimit(clientIp, path, windowMs);
    } catch (error) {
      this.logger.error(`Erro ao acessar Redis rate limit: ${error.message}`);
      // Fallback para memória em caso de erro
      return this.getRateLimitFromMemory(clientIp, path, windowMs, Date.now());
    }
  }

  /**
   * Obtém rate limit da memória (fallback)
   */
  private getRateLimitFromMemory(
    clientIp: string,
    path: string,
    windowMs: number,
    now: number,
  ): { count: number; resetTime: number } {
    const key = `${clientIp}:${path}`;
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Evitar crescimento ilimitado do store
      if (rateLimitStore.size >= MAX_STORE_ENTRIES) {
        this.cleanupExpiredEntries(now);
      }

      // Nova janela de tempo
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Incrementar contador
      entry.count++;
    }

    return entry;
  }

  /**
   * Limpa entradas expiradas do store em memória
   */
  private cleanupExpiredEntries(now: number): void {
    const expiredKeys: string[] = [];
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        expiredKeys.push(k);
      }
      if (expiredKeys.length >= 1000) break;
    }
    expiredKeys.forEach(k => rateLimitStore.delete(k));

    // Se ainda está cheio, remover as entradas mais antigas
    if (rateLimitStore.size >= MAX_STORE_ENTRIES) {
      const iterator = rateLimitStore.keys();
      for (let i = 0; i < 1000; i++) {
        const { value, done } = iterator.next();
        if (done) break;
        rateLimitStore.delete(value);
      }
    }
  }

  private formatRetryTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hora${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}min`;
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
