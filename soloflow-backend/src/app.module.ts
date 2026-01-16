import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
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
import { ChildProcessesModule } from './modules/child-processes/child-processes.module';
import { SubTasksModule } from './modules/sub-tasks/sub-tasks.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
       envFilePath: path.resolve(__dirname, '..', '.env'),
    }),
    PrismaModule,
    StorageModule,
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
    ChildProcessesModule,
    SubTasksModule,
  ],
})
export class AppModule {}
