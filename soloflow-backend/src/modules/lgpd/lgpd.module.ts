// src/modules/lgpd/lgpd.module.ts
import { Module, Global } from '@nestjs/common';
import { LgpdService } from './lgpd.service';
import { LgpdController } from './lgpd.controller';
import { CryptoService } from './crypto.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [LgpdController],
  providers: [LgpdService, CryptoService],
  exports: [LgpdService, CryptoService],
})
export class LgpdModule {}
