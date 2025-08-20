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
import { UploadResponse } from './processes.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ExecuteStepDto } from './dto/execute-step.dto';
import { UploadAttachmentDto, ProcessFileUploadDto } from './dto/upload-attachment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerConfig } from '../../config/multer.config';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  // ✅ ENDPOINT PRINCIPAL: Criar processo (apenas dados JSON)
  @Post()
  async create(
    @Body() createDto: CreateProcessInstanceDto, 
    @Request() req
  ) : Promise<any> {
    return this.processesService.createInstance(createDto, req.user.id);
  }

  // ✅ ENDPOINT CORRIGIDO: Upload de arquivo único para campo específico
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadProcessFile(
    @Param('id') processId: string,
    @Body() uploadDto: ProcessFileUploadDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ): Promise<UploadResponse> {
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

  // ✅ NOVO: Upload de múltiplos arquivos para campo específico
  @Post(':id/upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async uploadProcessFiles(
    @Param('id') processId: string,
    @Body() uploadDto: ProcessFileUploadDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ): Promise<UploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Pelo menos um arquivo é obrigatório');
    }

    if (!uploadDto.fieldName) {
      throw new BadRequestException('Nome do campo é obrigatório');
    }

    return this.processesService.uploadProcessFiles(
      processId, 
      uploadDto.fieldName, 
      files, 
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
  ): Promise<UploadResponse> {
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
  ): Promise<void> {
    return this.processesService.downloadAttachment(attachmentId, req.user.id, res);
  }

  // ✅ NOVO: Visualizar anexo (inline)
  @Get('attachment/:attachmentId/view')
  async viewAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
    @Request() req
  ): Promise<void> {
    return this.processesService.viewAttachment(attachmentId, req.user.id, res);
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
  // Executar etapa
  @Post('execute-step')
async executeStep(@Body() executeDto: ExecuteStepDto, @Request() req) {
  console.log('🚀 ExecuteStep called with:', {
    executeDto,
    user: req.user.id,
    userEmail: req.user.email,
    timestamp: new Date().toISOString()
  });

  // ✅ VALIDAÇÃO ADICIONAL NO CONTROLLER
  if (!executeDto.stepExecutionId) {
    console.log('❌ Missing stepExecutionId');
    throw new BadRequestException('stepExecutionId é obrigatório');
  }

  // Verificar se stepExecutionId é um UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(executeDto.stepExecutionId)) {
    console.log('❌ Invalid stepExecutionId format:', executeDto.stepExecutionId);
    throw new BadRequestException('stepExecutionId deve ser um UUID válido');
  }

  try {
    console.log('✅ Calling service with validated data');
    const result = await this.processesService.executeStep(executeDto, req.user.id);
    
    console.log('✅ Step executed successfully:', {
      stepExecutionId: executeDto.stepExecutionId,
      action: executeDto.action,
      resultId: result.id
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error in executeStep controller:', {
      error: error.message,
      stack: error.stack,
      executeDto,
      userId: req.user.id
    });
    throw error;
  }
}
}