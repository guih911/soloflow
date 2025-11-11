import { Module } from '@nestjs/common';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { SimpleSignatureService } from './simple-signature.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IpService } from '../../common/services/ip-service';

@Module({
  controllers: [SignaturesController],
  providers: [SignaturesService, SimpleSignatureService, PrismaService, IpService],
  exports: [SignaturesService, SimpleSignatureService],
})
export class SignaturesModule {}
