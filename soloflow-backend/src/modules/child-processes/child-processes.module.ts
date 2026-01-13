import { Module } from '@nestjs/common';
import { ChildProcessesController } from './child-processes.controller';
import { ChildProcessesService } from './child-processes.service';

@Module({
  controllers: [ChildProcessesController],
  providers: [ChildProcessesService],
  exports: [ChildProcessesService],
})
export class ChildProcessesModule {}