import { Module } from '@nestjs/common';
import { SubTasksController } from './sub-tasks.controller';
import { SubTasksService } from './sub-tasks.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubTasksController],
  providers: [SubTasksService],
  exports: [SubTasksService],
})
export class SubTasksModule {}
