import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProcessesService } from './processes.service';
import { ProcessesController } from './processes.controller';
import { multerConfig } from '../../config/multer.config';

@Module({
  imports: [
    MulterModule.register(multerConfig),
  ],
  controllers: [ProcessesController],
  providers: [ProcessesService],
  exports: [ProcessesService],
})
export class ProcessesModule {}