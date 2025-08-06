import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ExecuteStepDto } from './dto/execute-step.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  create(@Body() createDto: CreateProcessInstanceDto, @Request() req) {
    return this.processesService.createInstance(createDto, req.user.id);
  }

  

  @Post('execute-step')
  executeStep(@Body() executeDto: ExecuteStepDto, @Request() req) {
    return this.processesService.executeStep(executeDto, req.user.id);
  }
}