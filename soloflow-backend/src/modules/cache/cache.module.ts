import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisClientService } from './redis-client.service';

@Global()
@Module({
  providers: [RedisClientService, CacheService],
  exports: [CacheService, RedisClientService],
})
export class CacheModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly redisClient: RedisClientService) {}

  async onModuleInit() {
    await this.redisClient.connect();
  }

  async onModuleDestroy() {
    await this.redisClient.disconnect();
  }
}
