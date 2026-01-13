import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubTasksService } from './sub-tasks.service';
import {
  CreateSubTaskTemplateDto,
  UpdateSubTaskTemplateDto,
  CreateSubTaskDto,
  ExecuteSubTaskDto,
  UpdateSubTaskDto,
} from './dto';

// Configuração do Multer para upload de anexos de sub-tarefas
const storage = diskStorage({
  destination: './uploads/subtasks',
  filename: (req, file, callback) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    callback(null, uniqueName);
  },
});

@Controller('sub-tasks')
@UseGuards(JwtAuthGuard)
export class SubTasksController {
  constructor(private readonly subTasksService: SubTasksService) {}

  // ════════════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ════════════════════════════════════════════════════════════════════════════════

  @Post('templates')
  async createTemplate(
    @Body() dto: CreateSubTaskTemplateDto,
    @Request() req,
  ) {
    return this.subTasksService.createTemplate(dto, req.user.id);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateSubTaskTemplateDto,
    @Request() req,
  ) {
    return this.subTasksService.updateTemplate(id, dto, req.user.id);
  }

  @Delete('templates/:id')
  async deleteTemplate(
    @Param('id') id: string,
    @Request() req,
  ) {
    await this.subTasksService.deleteTemplate(id, req.user.id);
    return { success: true };
  }

  @Get('templates/step/:stepVersionId')
  async getTemplatesByStep(
    @Param('stepVersionId') stepVersionId: string,
  ) {
    return this.subTasksService.getTemplatesByStep(stepVersionId);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SUB-TAREFAS
  // ════════════════════════════════════════════════════════════════════════════════

  @Post()
  async createSubTask(
    @Body() dto: CreateSubTaskDto,
    @Request() req,
  ) {
    return this.subTasksService.createSubTask(dto, req.user.id);
  }

  @Get('step-execution/:stepExecutionId')
  async getSubTasksByStepExecution(
    @Param('stepExecutionId') stepExecutionId: string,
    @Request() req,
  ) {
    return this.subTasksService.getSubTasksByStepExecution(stepExecutionId, req.user.id);
  }

  @Post('execute')
  async executeSubTask(
    @Body() dto: ExecuteSubTaskDto,
    @Request() req,
  ) {
    return this.subTasksService.executeSubTask(dto, req.user.id);
  }

  @Put(':id')
  async updateSubTask(
    @Param('id') id: string,
    @Body() dto: UpdateSubTaskDto,
    @Request() req,
  ) {
    return this.subTasksService.updateSubTask(id, dto, req.user.id);
  }

  @Delete(':id')
  async deleteSubTask(
    @Param('id') id: string,
    @Request() req,
  ) {
    await this.subTasksService.deleteSubTask(id, req.user.id);
    return { success: true };
  }

  @Post('create-from-templates/:stepExecutionId')
  async createSubTasksFromTemplates(
    @Param('stepExecutionId') stepExecutionId: string,
  ) {
    return this.subTasksService.createSubTasksFromTemplates(stepExecutionId);
  }

  @Get('check-required/:stepExecutionId')
  async checkAllRequiredSubTasksCompleted(
    @Param('stepExecutionId') stepExecutionId: string,
  ) {
    const completed = await this.subTasksService.checkAllRequiredSubTasksCompleted(stepExecutionId);
    return { allRequiredCompleted: completed };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      subTaskId: string;
      requireSignature?: string;
      signatureType?: string;
      signers?: string;
    },
    @Request() req,
  ) {
    // Parsear lista de assinantes se fornecida
    let signerIds: string[] = [];
    if (body.signers) {
      try {
        signerIds = JSON.parse(body.signers);
      } catch (e) {
        signerIds = [];
      }
    }

    return this.subTasksService.uploadAttachment(
      body.subTaskId,
      file.path,
      file.originalname,
      file.size,
      file.mimetype,
      req.user.id,
      body.requireSignature === 'true',
      body.signatureType || 'SEQUENTIAL',
      signerIds,
    );
  }

  @Get('attachment/:subTaskId/download')
  async downloadAttachment(
    @Param('subTaskId') subTaskId: string,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { path, filename, mimeType } = await this.subTasksService.getAttachmentForDownload(subTaskId, req.user.id);

    if (!existsSync(path)) {
      throw new Error('Arquivo não encontrado no sistema');
    }

    const file = createReadStream(path);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });

    return new StreamableFile(file);
  }
}
