import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProcessesService } from './processes.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ExecuteStepDto } from './dto/execute-step.dto';
import { UploadAttachmentDto, ProcessFileUploadDto } from './dto/upload-attachment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerConfig } from '../../config/multer.config';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async create(
    @Body() createDto: CreateProcessInstanceDto, 
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ) {
    return this.processesService.createInstance(createDto, req.user.id, files);
  }

  // Upload de arquivo para processo existente (campos dinâmicos)
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadProcessFile(
    @Param('id') processId: string,
    @Body() uploadDto: ProcessFileUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    if (!uploadDto.fieldName) {
      throw new BadRequestException('Nome do campo é obrigatório');
    }

    return this.processesService.uploadProcessFile(
      processId, 
      uploadDto.fieldName, 
      file, 
      req.user.id
    );
  }

  // Upload de anexo para step execution
  @Post('step-execution/:stepExecutionId/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadAttachment(
    @Param('stepExecutionId') stepExecutionId: string,
    @Body() uploadDto: UploadAttachmentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    return this.processesService.uploadAttachment(
      stepExecutionId, 
      file, 
      uploadDto.description,
      req.user.id
    );
  }

  // Download de anexo
  @Get('attachment/:attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @Request() req
  ) {
    return this.processesService.downloadAttachment(attachmentId, req.user.id, res);
  }

  // Listar todos os processos da empresa
  @Get()
  findAll(@Request() req, @Query() filters: any) {
    return this.processesService.findAll(req.user.companyId, req.user.id, filters);
  }

  // Buscar processo específico
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.processesService.findOne(id, req.user.id);
  }

  // Buscar tarefas do usuário logado
  @Get('my/tasks')
  getMyTasks(@Request() req) {
    return this.processesService.getMyTasks(req.user.id, req.user.companyId);
  }

  // Buscar processos criados pelo usuário
  @Get('my/created')
  getMyCreatedProcesses(@Request() req) {
    return this.processesService.getCreatedByUser(req.user.id, req.user.companyId);
  }

  // Buscar estatísticas para dashboard
  @Get('stats/dashboard')
  getDashboardStats(@Request() req) {
    return this.processesService.getDashboardStats(req.user.id, req.user.companyId);
  }

  @Post('execute-step')
  executeStep(@Body() executeDto: ExecuteStepDto, @Request() req) {
    return this.processesService.executeStep(executeDto, req.user.id);
  }
}