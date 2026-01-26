import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfilesModule } from '../profiles/profiles.module';
import { ScopeGuard } from '../auth/guards/scope.guard';

@Module({
  imports: [ProfilesModule],
  controllers: [UsersController],
  providers: [UsersService, ScopeGuard],
  exports: [UsersService],
})
export class UsersModule {}