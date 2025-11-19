import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SectorsModule } from './modules/sectors/sectors.module';
import { ProcessTypesModule } from './modules/process-types/process-types.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { AuditModule } from './modules/audit/audit.module';
import { CacheModule } from './modules/cache/cache.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    SectorsModule,
    ProcessTypesModule,
    ProcessesModule,
    AttachmentsModule,
    ProfilesModule,
    SignaturesModule,
    AuditModule,
    NotificationsModule,
  ],
})
export class AppModule {}
