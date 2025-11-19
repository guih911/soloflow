import { Module, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async () => {
        const logger = new Logger('CacheModule');

        try {
          const store = await redisStore({
            socket: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            password: process.env.REDIS_PASSWORD || undefined,
            ttl: parseInt(process.env.REDIS_TTL || '300'), // 5 minutes default
          });

          logger.log('✅ Redis cache connected successfully');
          return {
            store: store as any,
            ttl: parseInt(process.env.REDIS_TTL || '300'),
          };
        } catch (error) {
          logger.warn(`⚠️  Redis connection failed: ${error.message}`);
          logger.warn('Falling back to in-memory cache');

          // Fallback to in-memory cache if Redis is not available
          return {
            ttl: parseInt(process.env.REDIS_TTL || '300'),
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
