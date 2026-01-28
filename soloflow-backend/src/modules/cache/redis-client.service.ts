import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisClientService {
  private readonly logger = new Logger(RedisClientService.name);
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  // Fallback em memória quando Redis não está disponível
  private memoryStore = new Map<string, { value: string; expireAt: number | null }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    // Se já está conectando, aguardar
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<void> {
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisTls = process.env.REDIS_TLS === 'true';

    // Se não há host configurado, usar memória
    if (!redisHost) {
      this.logger.warn('⚠️  REDIS_HOST não configurado - usando cache em memória');
      this.startMemoryCleanup();
      return;
    }

    this.logger.log(`🔄 Conectando ao Redis: ${redisHost}:${redisPort}...`);

    try {
      // Construir URL de conexão
      const protocol = redisTls ? 'rediss' : 'redis';
      let url = `${protocol}://`;

      if (redisPassword) {
        url += `:${redisPassword}@`;
      }

      url += `${redisHost}:${redisPort}`;

      this.client = createClient({
        url,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              this.logger.warn('⚠️  Redis: máximo de tentativas atingido, usando memória');
              return false; // Para de tentar reconectar
            }
            return Math.min(retries * 500, 2000); // Backoff exponencial
          },
        },
      });

      // Handlers de eventos
      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.error(`❌ Redis error: ${err.message}`);
          this.isConnected = false;
          this.startMemoryCleanup();
        }
      });

      this.client.on('connect', () => {
        this.logger.log('🔌 Redis: conectando...');
      });

      this.client.on('ready', () => {
        this.logger.log('✅ Redis conectado e pronto!');
        this.isConnected = true;
        this.stopMemoryCleanup();
      });

      this.client.on('reconnecting', () => {
        this.logger.warn('🔄 Redis: reconectando...');
      });

      this.client.on('end', () => {
        this.logger.warn('🔌 Redis: conexão encerrada');
        this.isConnected = false;
      });

      // Conectar com timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de conexão')), 5000),
        ),
      ]);

      // Testar conexão
      await this.client.ping();
      this.isConnected = true;
      this.logger.log('✅ Redis cache conectado com sucesso!');
    } catch (error) {
      this.logger.warn(`⚠️  Falha ao conectar ao Redis: ${error.message}`);
      this.logger.warn('📦 Usando cache em memória como fallback');
      this.isConnected = false;
      this.client = null;
      this.startMemoryCleanup();
    }
  }

  async disconnect(): Promise<void> {
    this.stopMemoryCleanup();
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.log('Redis desconectado');
      } catch (error) {
        this.logger.error(`Erro ao desconectar do Redis: ${error.message}`);
      }
    }
    this.client = null;
    this.isConnected = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Operações de Cache
  // ═══════════════════════════════════════════════════════════════════════════════

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      }

      // Fallback para memória
      return this.memoryGet<T>(key);
    } catch (error) {
      this.logger.error(`Erro ao buscar cache [${key}]: ${error.message}`);
      return this.memoryGet<T>(key);
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || parseInt(process.env.REDIS_TTL || '300');

      if (this.isConnected && this.client) {
        await this.client.setEx(key, ttl, serialized);
        return;
      }

      // Fallback para memória
      this.memorySet(key, serialized, ttl);
    } catch (error) {
      this.logger.error(`Erro ao definir cache [${key}]: ${error.message}`);
      this.memorySet(key, JSON.stringify(value), ttlSeconds || 300);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      }
      this.memoryStore.delete(key);
    } catch (error) {
      this.logger.error(`Erro ao deletar cache [${key}]: ${error.message}`);
      this.memoryStore.delete(key);
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      if (this.isConnected && this.client) {
        // Usar SCAN para encontrar chaves (mais seguro que KEYS em produção)
        const keys: string[] = [];
        let cursor: string | number = 0;

        do {
          const result = await this.client.scan(cursor as any, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = result.cursor;
          keys.push(...result.keys);
        } while (Number(cursor) !== 0);

        if (keys.length > 0) {
          await this.client.del(keys);
          this.logger.debug(`Deletadas ${keys.length} chaves com padrão: ${pattern}`);
        }
        return keys.length;
      }

      // Fallback para memória - converter padrão glob para regex
      const regex = this.globToRegex(pattern);
      let count = 0;
      for (const key of this.memoryStore.keys()) {
        if (regex.test(key)) {
          this.memoryStore.delete(key);
          count++;
        }
      }
      return count;
    } catch (error) {
      this.logger.error(`Erro ao deletar padrão [${pattern}]: ${error.message}`);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (this.isConnected && this.client) {
        const keys: string[] = [];
        let cursor: string | number = 0;

        do {
          const result = await this.client.scan(cursor as any, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = result.cursor;
          keys.push(...result.keys);
        } while (Number(cursor) !== 0);

        return keys;
      }

      // Fallback para memória
      const regex = this.globToRegex(pattern);
      return Array.from(this.memoryStore.keys()).filter((key) => regex.test(key));
    } catch (error) {
      this.logger.error(`Erro ao buscar chaves [${pattern}]: ${error.message}`);
      return [];
    }
  }

  async reset(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.flushDb();
        this.logger.warn('Redis: banco de dados limpo');
      }
      this.memoryStore.clear();
    } catch (error) {
      this.logger.error(`Erro ao limpar cache: ${error.message}`);
      this.memoryStore.clear();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Operações Atômicas para Rate Limiting
  // ═══════════════════════════════════════════════════════════════════════════════

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (this.isConnected && this.client) {
        const count = await this.client.incr(key);
        if (ttlSeconds && count === 1) {
          await this.client.expire(key, ttlSeconds);
        }
        return count;
      }

      // Fallback para memória
      const existing = this.memoryStore.get(key);
      const now = Date.now();

      if (existing && (existing.expireAt === null || existing.expireAt > now)) {
        const newCount = parseInt(existing.value) + 1;
        existing.value = newCount.toString();
        return newCount;
      }

      const expireAt = ttlSeconds ? now + ttlSeconds * 1000 : null;
      this.memoryStore.set(key, { value: '1', expireAt });
      return 1;
    } catch (error) {
      this.logger.error(`Erro ao incrementar [${key}]: ${error.message}`);
      return 1;
    }
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    try {
      if (this.isConnected && this.client) {
        return await this.client.hIncrBy(key, field, increment);
      }

      // Fallback para memória usando chave composta
      const compositeKey = `${key}:${field}`;
      const existing = this.memoryStore.get(compositeKey);
      const currentValue = existing ? parseInt(existing.value) || 0 : 0;
      const newValue = currentValue + increment;
      this.memoryStore.set(compositeKey, { value: newValue.toString(), expireAt: null });
      return newValue;
    } catch (error) {
      this.logger.error(`Erro ao incrementar hash [${key}:${field}]: ${error.message}`);
      return increment;
    }
  }

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      if (this.isConnected && this.client) {
        return await this.client.hGet(key, field);
      }

      // Fallback para memória
      const compositeKey = `${key}:${field}`;
      const existing = this.memoryStore.get(compositeKey);
      return existing?.value || null;
    } catch (error) {
      this.logger.error(`Erro ao buscar hash [${key}:${field}]: ${error.message}`);
      return null;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.hSet(key, field, value);
        return;
      }

      // Fallback para memória
      const compositeKey = `${key}:${field}`;
      this.memoryStore.set(compositeKey, { value, expireAt: null });
    } catch (error) {
      this.logger.error(`Erro ao definir hash [${key}:${field}]: ${error.message}`);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.expire(key, seconds);
        return;
      }

      // Fallback para memória
      const existing = this.memoryStore.get(key);
      if (existing) {
        existing.expireAt = Date.now() + seconds * 1000;
      }
    } catch (error) {
      this.logger.error(`Erro ao definir expiração [${key}]: ${error.message}`);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (this.isConnected && this.client) {
        return await this.client.ttl(key);
      }

      // Fallback para memória
      const existing = this.memoryStore.get(key);
      if (!existing) return -2; // Chave não existe
      if (existing.expireAt === null) return -1; // Sem expiração
      const remaining = Math.ceil((existing.expireAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    } catch (error) {
      this.logger.error(`Erro ao buscar TTL [${key}]: ${error.message}`);
      return -2;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Utilitários
  // ═══════════════════════════════════════════════════════════════════════════════

  isRedisConnected(): boolean {
    return this.isConnected;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Cache em Memória (Fallback)
  // ═══════════════════════════════════════════════════════════════════════════════

  private memoryGet<T>(key: string): T | null {
    const item = this.memoryStore.get(key);
    if (!item) return null;

    // Verificar expiração
    if (item.expireAt !== null && item.expireAt < Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    try {
      return JSON.parse(item.value) as T;
    } catch {
      return item.value as unknown as T;
    }
  }

  private memorySet(key: string, value: string, ttlSeconds: number): void {
    const expireAt = Date.now() + ttlSeconds * 1000;
    this.memoryStore.set(key, { value, expireAt });

    // Limitar tamanho do store em memória
    if (this.memoryStore.size > 10000) {
      this.cleanupExpiredMemoryEntries();
    }
  }

  private startMemoryCleanup(): void {
    if (this.cleanupInterval) return;

    // Limpar entradas expiradas a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMemoryEntries();
    }, 5 * 60 * 1000);
  }

  private stopMemoryCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanupExpiredMemoryEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.memoryStore.entries()) {
      if (item.expireAt !== null && item.expireAt < now) {
        this.memoryStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cache em memória: ${cleaned} entradas expiradas removidas`);
    }
  }

  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
  }
}
