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
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubTasksService } from './sub-tasks.service';
import { multerConfig } from '../../config/multer.config';
import {
  CreateSubTaskTemplateDto,
  UpdateSubTaskTemplateDto,
  CreateSubTaskDto,
  ExecuteSubTaskDto,
  UpdateSubTaskDto,
} from './dto';

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
  @UseInterceptors(FileInterceptor('file', multerConfig))
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
      file,
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
    try {
      const { stream, filename, mimeType, size } = await this.subTasksService.downloadAttachment(subTaskId, req.user.id);

      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': size.toString(),
      });

      return new StreamableFile(stream);
    } catch (error) {
      throw new NotFoundException('Arquivo não encontrado');
    }
  }
}
