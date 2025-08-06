import { Module } from '@nestjs/common';
import { ProcessTypesService } from './process-types.service';
import { ProcessTypesController } from './process-types.controller';

@Module({
  controllers: [ProcessTypesController],
  providers: [ProcessTypesService],
  exports: [ProcessTypesService],
})
export class ProcessTypesModule {}