import { Module } from '@nestjs/common';
import { SectorsService } from './sectors.service';
import { SectorsController } from './sectors.controller';
import { ProfilesModule } from '../profiles/profiles.module';
import { ScopeGuard } from '../auth/guards/scope.guard';

@Module({
  imports: [ProfilesModule],
  controllers: [SectorsController],
  providers: [SectorsService, ScopeGuard],
  exports: [SectorsService],
})
export class SectorsModule {}