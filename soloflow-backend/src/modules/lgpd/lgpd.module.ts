// src/modules/lgpd/lgpd.module.ts
import { Module, Global } from '@nestjs/common';
import { LgpdService } from './lgpd.service';
import { LgpdController } from './lgpd.controller';
import { CryptoService } from './crypto.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ScopeGuard } from '../auth/guards/scope.guard';

@Global()
@Module({
  imports: [PrismaModule, ProfilesModule],
  controllers: [LgpdController],
  providers: [LgpdService, CryptoService, ScopeGuard],
  exports: [LgpdService, CryptoService],
})
export class LgpdModule {}
