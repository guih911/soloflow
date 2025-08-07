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

  // ✅ NOVO: Listar todos os processos da empresa
  @Get()
  findAll(@Request() req, @Query() filters: any) {
    return this.processesService.findAll(req.user.companyId, req.user.id, filters);
  }

  // ✅ NOVO: Buscar processo específico
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.processesService.findOne(id, req.user.id);
  }

  // ✅ NOVO: Buscar tarefas do usuário logado
  @Get('my/tasks')
  getMyTasks(@Request() req) {
    return this.processesService.getMyTasks(req.user.id, req.user.companyId);
  }

  // ✅ NOVO: Buscar processos criados pelo usuário
  @Get('my/created')
  getMyCreatedProcesses(@Request() req) {
    return this.processesService.getCreatedByUser(req.user.id, req.user.companyId);
  }

  // ✅ NOVO: Buscar estatísticas para dashboard
  @Get('stats/dashboard')
  getDashboardStats(@Request() req) {
    return this.processesService.getDashboardStats(req.user.id, req.user.companyId);
  }

  @Post('execute-step')
  executeStep(@Body() executeDto: ExecuteStepDto, @Request() req) {
    return this.processesService.executeStep(executeDto, req.user.id);
  }
}