import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuditModule } from '../audit/audit.module';
import { ScopeGuard } from './guards/scope.guard';

@Module({
  imports: [
    UsersModule,
    ProfilesModule,
    AuditModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION || '8h') as any,
        issuer: 'soloflow-api',
        audience: 'soloflow-client'
      },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, ScopeGuard],
  controllers: [AuthController],
  exports: [AuthService, ScopeGuard],
})
export class AuthModule {}
