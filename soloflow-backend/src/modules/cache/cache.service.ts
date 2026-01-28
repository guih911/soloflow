import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Serviço centralizado para operações de cache usando Redis
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Busca um valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Define um valor no cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'})`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error.message);
    }
  }

  /**
   * Remove um valor do cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error.message);
    }
  }

  /**
   * Remove múltiplas chaves do cache baseado em um padrão
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Para redis, usamos o método stores[0].keys() para buscar todas as chaves que correspondem ao padrão
      const stores = (this.cacheManager as any).stores;
      if (stores && stores[0] && typeof stores[0].keys === 'function') {
        const keys = await stores[0].keys(pattern);
        if (keys && keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.del(key)));
          this.logger.debug(`Cache DEL Pattern: ${pattern} (${keys.length} keys)`);
        }
      } else {
        // Fallback: se não suportar busca por padrão, apenas loga um aviso
        this.logger.warn(`Cache store doesn't support pattern deletion: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Limpa todo o cache
   */
  async reset(): Promise<void> {
    try {
      // Note: reset() pode não estar disponível em todos os cache stores
      // Vamos tentar, mas se falhar, apenas loga
      if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
        this.logger.warn('Cache RESET: All keys cleared');
      } else {
        this.logger.warn('Cache reset not supported by current store');
      }
    } catch (error) {
      this.logger.error('Error resetting cache:', error.message);
    }
  }

  /**
   * Wrapper para execução com cache
   * Se o valor não existir no cache, executa a função e armazena o resultado
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fn();
      await this.set(key, result, ttl);
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
      // Tentar acessar o store Redis diretamente para operações atômicas
      const stores = (this.cacheManager as any).stores;
      const redisClient = stores?.[0]?.client;

      if (redisClient && typeof redisClient.multi === 'function') {
        // Usar transação Redis para operação atômica
        return await this.incrementWithRedis(redisClient, key, now, windowMs, ttlSeconds);
      }

      // Fallback para cache-manager padrão (menos eficiente, mas funcional)
      return await this.incrementWithCacheManager(key, now, windowMs, ttlSeconds);
    } catch (error) {
      this.logger.error(`Rate limit error for ${key}:`, error.message);
      // Em caso de erro, permitir a requisição (fail-open para não bloquear usuários)
      return { count: 1, resetTime: now + windowMs };
    }
  }

  /**
   * Incrementa usando cliente Redis diretamente (mais eficiente)
   */
  private async incrementWithRedis(
    redisClient: any,
    key: string,
    now: number,
    windowMs: number,
    ttlSeconds: number,
  ): Promise<{ count: number; resetTime: number }> {
    const dataKey = `${key}:data`;

    // Usar MULTI/EXEC para operação atômica
    const result = await redisClient
      .multi()
      .hIncrBy(dataKey, 'count', 1)
      .hGet(dataKey, 'resetTime')
      .expire(dataKey, ttlSeconds)
      .exec();

    const count = result[0] || 1;
    let resetTime = parseInt(result[1]) || 0;

    // Se não existe resetTime ou já expirou, definir novo
    if (!resetTime || now > resetTime) {
      resetTime = now + windowMs;
      await redisClient.hSet(dataKey, 'resetTime', resetTime.toString());
      await redisClient.hSet(dataKey, 'count', '1');
      return { count: 1, resetTime };
    }

    return { count, resetTime };
  }

  /**
   * Incrementa usando cache-manager (fallback)
   */
  private async incrementWithCacheManager(
    key: string,
    now: number,
    windowMs: number,
    ttlSeconds: number,
  ): Promise<{ count: number; resetTime: number }> {
    const cached = await this.get<{ count: number; resetTime: number }>(key);

    if (!cached || now > cached.resetTime) {
      // Nova janela de tempo
      const data = { count: 1, resetTime: now + windowMs };
      await this.set(key, data, ttlSeconds * 1000);
      return data;
    }

    // Incrementar contador
    cached.count++;
    await this.set(key, cached, ttlSeconds * 1000);
    return cached;
  }

  /**
   * Obtém o estado atual do rate limit sem incrementar
   */
  async getRateLimitState(
    clientIp: string,
    path: string,
  ): Promise<{ count: number; resetTime: number } | null> {
    const key = this.getRateLimitKey(clientIp, path);
    return await this.get<{ count: number; resetTime: number }>(key);
  }

  /**
   * Reseta o rate limit para um cliente/path específico
   */
  async resetRateLimit(clientIp: string, path: string): Promise<void> {
    const key = this.getRateLimitKey(clientIp, path);
    await this.del(key);
    await this.del(`${key}:data`);
  }

  /**
   * Verifica se o Redis está disponível
   */
  async isRedisAvailable(): Promise<boolean> {
    try {
      // Método 1: Verificar via stores (cache-manager-redis-store v2)
      const stores = (this.cacheManager as any).stores;
      const redisClient = stores?.[0]?.client;
      if (redisClient && typeof redisClient.ping === 'function') {
        await redisClient.ping();
        return true;
      }

      // Método 2: Verificar via store direto (cache-manager-redis-store v3+)
      const store = (this.cacheManager as any).store;
      if (store?.client && typeof store.client.ping === 'function') {
        await store.client.ping();
        return true;
      }

      // Método 3: Tentar uma operação de cache simples
      const testKey = '__redis_test__';
      await this.cacheManager.set(testKey, 'test', 1000);
      const result = await this.cacheManager.get(testKey);
      await this.cacheManager.del(testKey);

      // Se a operação funcionar e o store tiver propriedades típicas de Redis, consideramos disponível
      if (result === 'test' && (stores?.[0]?.name === 'redis' || store?.name === 'redis')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
