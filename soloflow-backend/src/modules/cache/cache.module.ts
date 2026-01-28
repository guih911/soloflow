import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Global() // Tornar global para que CacheService esteja disponível em toda aplicação
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async () => {
        const logger = new Logger('CacheModule');

        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const hasPassword = !!process.env.REDIS_PASSWORD;
        const ttl = parseInt(process.env.REDIS_TTL || '300');

        // Se não houver host configurado explicitamente, usar in-memory
        if (!process.env.REDIS_HOST) {
          logger.warn('⚠️  REDIS_HOST não configurado, usando cache em memória');
          return { ttl };
        }

        logger.log(`Conectando ao Redis: ${redisHost}:${redisPort} (senha: ${hasPassword ? 'sim' : 'não'})`);

        try {
          const store = await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
              connectTimeout: 5000,
            },
            password: process.env.REDIS_PASSWORD || undefined,
            ttl,
          });

          logger.log('✅ Redis cache connected successfully');
          return {
            store: store as any,
            ttl,
          };
        } catch (error) {
          logger.warn(`⚠️  Redis connection failed: ${error.message}`);
          logger.warn('Falling back to in-memory cache');

          // Fallback to in-memory cache if Redis is not available
          return { ttl };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
