import { Injectable, Logger } from '@nestjs/common';
import { RedisClientService } from './redis-client.service';

/**
 * Serviço centralizado para operações de cache usando Redis
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisClientService) {}

  /**
   * Busca um valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<T>(key);
    if (value) {
      this.logger.debug(`Cache HIT: ${key}`);
    } else {
      this.logger.debug(`Cache MISS: ${key}`);
    }
    return value;
  }

  /**
   * Define um valor no cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.redis.set(key, value, ttlSeconds);
    this.logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds || 'default'}s)`);
  }

  /**
   * Remove um valor do cache
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Cache DEL: ${key}`);
  }

  /**
   * Remove múltiplas chaves do cache baseado em um padrão
   */
  async delPattern(pattern: string): Promise<void> {
    const count = await this.redis.delPattern(pattern);
    this.logger.debug(`Cache DEL Pattern: ${pattern} (${count} keys)`);
  }

  /**
   * Limpa todo o cache
   */
  async reset(): Promise<void> {
    await this.redis.reset();
    this.logger.warn('Cache RESET: All keys cleared');
  }

  /**
   * Wrapper para execução com cache
   * Se o valor não existir no cache, executa a função e armazena o resultado
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fn();
      await this.set(key, result, ttlSeconds);
      return result;
    } catch (error) {
      this.logger.error(`Error wrapping cache key ${key}:`, error.message);
      // Se houver erro no cache, executa a função diretamente
      return await fn();
    }
  }

  /**
   * Gera uma chave de cache para permissões de usuário
   */
  getUserPermissionsCacheKey(userId: string, companyId: string): string {
    return `permissions:${userId}:${companyId}`;
  }

  /**
   * Gera uma chave de cache para perfis de usuário
   */
  getUserProfilesCacheKey(userId: string, companyId: string): string {
    return `profiles:${userId}:${companyId}`;
  }

  /**
   * Invalida cache de permissões de um usuário
   */
  async invalidateUserPermissions(userId: string, companyId?: string): Promise<void> {
    if (companyId) {
      await this.del(this.getUserPermissionsCacheKey(userId, companyId));
    } else {
      // Invalida todas as empresas do usuário
      await this.delPattern(`permissions:${userId}:*`);
    }
  }

  /**
   * Invalida cache de perfis de um usuário
   */
  async invalidateUserProfiles(userId: string, companyId?: string): Promise<void> {
    if (companyId) {
      await this.del(this.getUserProfilesCacheKey(userId, companyId));
    } else {
      // Invalida todas as empresas do usuário
      await this.delPattern(`profiles:${userId}:*`);
    }
  }

  /**
   * Invalida todos os caches relacionados a um perfil
   */
  async invalidateProfile(profileId: string): Promise<void> {
    // Quando um perfil é modificado, precisamos invalidar os caches de todos os usuários que têm esse perfil
    // Por simplicidade, vamos invalidar todos os caches de permissões
    // Em produção, você pode manter um índice de userId->profileId no Redis
    await this.delPattern('permissions:*');
    await this.delPattern('profiles:*');
    this.logger.warn(`Profile ${profileId} modified - invalidated all user caches`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING - Controle de requisições distribuído com Redis
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Gera chave de rate limit
   */
  getRateLimitKey(clientIp: string, path: string): string {
    return `ratelimit:${clientIp}:${path}`;
  }

  /**
   * Incrementa contador de rate limit e retorna o estado atual
   * Usa operação atômica para garantir consistência em ambiente distribuído
   */
  async incrementRateLimit(
    clientIp: string,
    path: string,
    windowMs: number,
  ): Promise<{ count: number; resetTime: number }> {
    const key = this.getRateLimitKey(clientIp, path);
    const now = Date.now();
    const ttlSeconds = Math.ceil(windowMs / 1000);

    try {
      // Verificar se já existe um contador para esta janela
      const resetTimeKey = `${key}:reset`;
      const storedResetTime = await this.redis.get<number>(resetTimeKey);

      // Se não existe ou já expirou, criar nova janela
      if (!storedResetTime || now > storedResetTime) {
        const resetTime = now + windowMs;
        await this.redis.set(resetTimeKey, resetTime, ttlSeconds);
        await this.redis.set(key, 1, ttlSeconds);
        return { count: 1, resetTime };
      }

      // Incrementar contador
      const count = await this.redis.incr(key, ttlSeconds);
      return { count, resetTime: storedResetTime };
    } catch (error) {
      this.logger.error(`Rate limit error for ${key}:`, error.message);
      // Em caso de erro, permitir a requisição (fail-open para não bloquear usuários)
      return { count: 1, resetTime: now + windowMs };
    }
  }

  /**
   * Obtém o estado atual do rate limit sem incrementar
   */
  async getRateLimitState(
    clientIp: string,
    path: string,
  ): Promise<{ count: number; resetTime: number } | null> {
    const key = this.getRateLimitKey(clientIp, path);
    const resetTimeKey = `${key}:reset`;

    const [count, resetTime] = await Promise.all([
      this.redis.get<number>(key),
      this.redis.get<number>(resetTimeKey),
    ]);

    if (count === null || resetTime === null) {
      return null;
    }

    return { count, resetTime };
  }

  /**
   * Reseta o rate limit para um cliente/path específico
   */
  async resetRateLimit(clientIp: string, path: string): Promise<void> {
    const key = this.getRateLimitKey(clientIp, path);
    await this.redis.del(key);
    await this.redis.del(`${key}:reset`);
    await this.redis.del(`${key}:data`);
  }

  /**
   * Verifica se o Redis está disponível
   */
  async isRedisAvailable(): Promise<boolean> {
    return this.redis.isRedisConnected();
  }
}
