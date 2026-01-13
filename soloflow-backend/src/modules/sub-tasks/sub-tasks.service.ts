import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSubTaskTemplateDto,
  UpdateSubTaskTemplateDto,
  CreateSubTaskDto,
  ExecuteSubTaskDto,
  UpdateSubTaskDto,
} from './dto';
import {
  SubTask,
  SubTaskTemplate,
  SubTaskStatus,
  SubTaskAssignmentType,
  StepExecutionStatus,
} from '@prisma/client';

@Injectable()
export class SubTasksService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════════════════
  // TEMPLATES DE SUB-TAREFAS (Configuração no tipo de processo)
  // ════════════════════════════════════════════════════════════════════════════════

  async createTemplate(
    dto: CreateSubTaskTemplateDto,
    userId: string,
  ): Promise<SubTaskTemplate> {
    // Verificar se a etapa existe
    const stepVersion = await this.prisma.stepVersion.findUnique({
      where: { id: dto.stepVersionId },
      include: {
        processTypeVersion: {
          include: {
            processType: true,
          },
        },
      },
    });

    if (!stepVersion) {
      throw new NotFoundException('Etapa não encontrada');
    }

    return this.prisma.subTaskTemplate.create({
      data: {
        stepVersionId: dto.stepVersionId,
        name: dto.name,
        description: dto.description,
        instructions: dto.instructions,
        order: dto.order,
        executionMode: dto.executionMode || 'PARALLEL',
        assignmentType: dto.assignmentType || 'INHERIT',
        assignedToUserId: dto.assignedToUserId,
        assignedToSectorId: dto.assignedToSectorId,
        slaHours: dto.slaHours,
        slaDays: dto.slaDays,
        isRequired: dto.isRequired ?? true,
        allowAttachment: dto.allowAttachment ?? false,
      },
      include: {
        assignedToUser: {
          select: { id: true, name: true, email: true },
        },
        assignedToSector: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateTemplate(
    templateId: string,
    dto: UpdateSubTaskTemplateDto,
    userId: string,
  ): Promise<SubTaskTemplate> {
    const template = await this.prisma.subTaskTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template de sub-tarefa não encontrado');
    }

    return this.prisma.subTaskTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        instructions: dto.instructions,
        order: dto.order,
        executionMode: dto.executionMode,
        assignmentType: dto.assignmentType,
        assignedToUserId: dto.assignedToUserId,
        assignedToSectorId: dto.assignedToSectorId,
        slaHours: dto.slaHours,
        slaDays: dto.slaDays,
        isRequired: dto.isRequired,
        allowAttachment: dto.allowAttachment,
        isActive: dto.isActive,
      },
      include: {
        assignedToUser: {
          select: { id: true, name: true, email: true },
        },
        assignedToSector: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = await this.prisma.subTaskTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template de sub-tarefa não encontrado');
    }

    await this.prisma.subTaskTemplate.delete({
      where: { id: templateId },
    });
  }

  async getTemplatesByStep(stepVersionId: string): Promise<SubTaskTemplate[]> {
    return this.prisma.subTaskTemplate.findMany({
      where: {
        stepVersionId,
        isActive: true,
      },
      include: {
        assignedToUser: {
          select: { id: true, name: true, email: true },
        },
        assignedToSector: {
          select: { id: true, name: true },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SUB-TAREFAS (Execução)
  // ════════════════════════════════════════════════════════════════════════════════

  async createSubTask(
    dto: CreateSubTaskDto,
    userId: string,
  ): Promise<SubTask> {
    // Verificar se a etapa existe e está em andamento
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: dto.stepExecutionId },
      include: {
        processInstance: true,
        stepVersion: true,
      },
    });

    if (!stepExecution) {
      throw new NotFoundException('Execução de etapa não encontrada');
    }

    // Verificar permissão
    await this.checkStepPermission(stepExecution, userId);

    // Verificar se a etapa está em andamento
    if (stepExecution.status !== StepExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Só é possível criar sub-tarefas em etapas em andamento');
    }

    // Buscar a maior ordem existente para gerar uma nova ordem única
    const maxOrderTemplate = await this.prisma.subTaskTemplate.findFirst({
      where: { stepVersionId: stepExecution.stepVersionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (maxOrderTemplate?.order || 0) + 1;

    // Criar template temporário para a sub-tarefa manual
    const template = await this.prisma.subTaskTemplate.create({
      data: {
        stepVersionId: stepExecution.stepVersionId,
        name: dto.name,
        description: dto.description,
        instructions: dto.instructions,
        order: newOrder, // Ordem incremental única
        assignmentType: dto.assignedToUserId ? 'USER' : 'INHERIT',
        assignedToUserId: dto.assignedToUserId,
        slaHours: dto.slaHours,
        isRequired: false, // Sub-tarefas manuais não são obrigatórias
        allowAttachment: dto.allowAttachment ?? false,
      },
    });

    // Calcular dueAt baseado no SLA
    let dueAt: Date | null = null;
    if (dto.slaHours) {
      dueAt = new Date(Date.now() + dto.slaHours * 60 * 60 * 1000);
    }

    // Criar a sub-tarefa já em andamento
    return this.prisma.subTask.create({
      data: {
        stepExecutionId: dto.stepExecutionId,
        subTaskTemplateId: template.id,
        status: SubTaskStatus.IN_PROGRESS,
        executorId: dto.assignedToUserId || null,
        startedAt: new Date(),
        dueAt,
      },
      include: {
        subTaskTemplate: true,
        executor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getSubTasksByStepExecution(
    stepExecutionId: string,
    userId: string,
  ): Promise<SubTask[]> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: stepExecutionId },
      include: { processInstance: true },
    });

    if (!stepExecution) {
      throw new NotFoundException('Execução de etapa não encontrada');
    }

    await this.checkViewPermission(stepExecution.processInstance, userId);

    return this.prisma.subTask.findMany({
      where: { stepExecutionId },
      include: {
        subTaskTemplate: true,
        executor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { subTaskTemplate: { order: 'asc' } },
    });
  }

  async executeSubTask(
    dto: ExecuteSubTaskDto,
    userId: string,
  ): Promise<SubTask> {
    const subTask = await this.prisma.subTask.findUnique({
      where: { id: dto.subTaskId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
        subTaskTemplate: true,
      },
    });

    if (!subTask) {
      throw new NotFoundException('Sub-tarefa não encontrada');
    }

    await this.checkStepPermission(subTask.stepExecution, userId);

    // Verificar se o usuário é o responsável (se tiver um definido)
    if (subTask.executorId && subTask.executorId !== userId) {
      throw new ForbiddenException(
        'Apenas o responsável atribuído pode executar esta sub-tarefa',
      );
    }

    // Verificar se pode executar
    if (subTask.status === SubTaskStatus.COMPLETED || subTask.status === SubTaskStatus.CANCELLED) {
      throw new BadRequestException('Esta sub-tarefa já foi finalizada');
    }

    const now = new Date();
    const updateData: any = {
      status: dto.status,
      comment: dto.comment,
      executorId: userId,
    };

    // Se está iniciando
    if (dto.status === SubTaskStatus.IN_PROGRESS && !subTask.startedAt) {
      updateData.startedAt = now;
    }

    // Se está finalizando
    if (dto.status === SubTaskStatus.COMPLETED || dto.status === SubTaskStatus.SKIPPED || dto.status === SubTaskStatus.CANCELLED) {
      updateData.completedAt = now;
    }

    return this.prisma.subTask.update({
      where: { id: dto.subTaskId },
      data: updateData,
      include: {
        subTaskTemplate: true,
        executor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateSubTask(
    subTaskId: string,
    dto: UpdateSubTaskDto,
    userId: string,
  ): Promise<SubTask> {
    const subTask = await this.prisma.subTask.findUnique({
      where: { id: subTaskId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
      },
    });

    if (!subTask) {
      throw new NotFoundException('Sub-tarefa não encontrada');
    }

    await this.checkStepPermission(subTask.stepExecution, userId);

    return this.prisma.subTask.update({
      where: { id: subTaskId },
      data: {
        status: dto.status,
        comment: dto.comment,
        executorId: dto.executorId,
      },
      include: {
        subTaskTemplate: true,
        executor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteSubTask(subTaskId: string, userId: string): Promise<void> {
    const subTask = await this.prisma.subTask.findUnique({
      where: { id: subTaskId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
        subTaskTemplate: true,
      },
    });

    if (!subTask) {
      throw new NotFoundException('Sub-tarefa não encontrada');
    }

    await this.checkStepPermission(subTask.stepExecution, userId);

    // Só pode deletar sub-tarefas que ainda não foram iniciadas
    if (subTask.status !== SubTaskStatus.PENDING) {
      throw new BadRequestException('Só é possível remover sub-tarefas pendentes');
    }

    await this.prisma.subTask.delete({
      where: { id: subTaskId },
    });

    // Verificar se o template tem outras sub-tarefas associadas
    const otherSubTasks = await this.prisma.subTask.count({
      where: { subTaskTemplateId: subTask.subTaskTemplateId },
    });

    // Se não há outras sub-tarefas usando este template, podemos deletá-lo
    // (templates manuais criados para sub-tarefas ad-hoc)
    if (otherSubTasks === 0 && !subTask.subTaskTemplate.isRequired) {
      await this.prisma.subTaskTemplate.delete({
        where: { id: subTask.subTaskTemplateId },
      });
    }
  }

  // Criar sub-tarefas automaticamente quando uma etapa inicia
  async createSubTasksFromTemplates(stepExecutionId: string): Promise<SubTask[]> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: stepExecutionId },
      include: {
        stepVersion: {
          include: {
            subTaskTemplates: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
        processInstance: true,
      },
    });

    if (!stepExecution) {
      throw new NotFoundException('Execução de etapa não encontrada');
    }

    const templates = stepExecution.stepVersion.subTaskTemplates;
    if (templates.length === 0) {
      return [];
    }

    const createdSubTasks: SubTask[] = [];

    for (const template of templates) {
      // Determinar executor baseado no tipo de atribuição
      let executorId: string | null = null;

      switch (template.assignmentType) {
        case SubTaskAssignmentType.USER:
          executorId = template.assignedToUserId;
          break;
        case SubTaskAssignmentType.CREATOR:
          executorId = stepExecution.processInstance.createdById;
          break;
        case SubTaskAssignmentType.INHERIT:
          executorId = stepExecution.executorId;
          break;
        // SECTOR não define executorId individual
      }

      // Calcular dueAt
      let dueAt: Date | null = null;
      const slaHours = template.slaDays ? template.slaDays * 24 : template.slaHours;
      if (slaHours) {
        dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);
      }

      const subTask = await this.prisma.subTask.create({
        data: {
          stepExecutionId,
          subTaskTemplateId: template.id,
          status: SubTaskStatus.PENDING,
          executorId,
          dueAt,
        },
        include: {
          subTaskTemplate: true,
          executor: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      createdSubTasks.push(subTask);
    }

    return createdSubTasks;
  }

  // Verificar se todas as sub-tarefas obrigatórias foram concluídas
  async checkAllRequiredSubTasksCompleted(stepExecutionId: string): Promise<boolean> {
    const subTasks = await this.prisma.subTask.findMany({
      where: { stepExecutionId },
      include: { subTaskTemplate: true },
    });

    for (const subTask of subTasks) {
      if (subTask.subTaskTemplate.isRequired) {
        if (subTask.status !== SubTaskStatus.COMPLETED && subTask.status !== SubTaskStatus.SKIPPED) {
          return false;
        }
      }
    }

    return true;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ════════════════════════════════════════════════════════════════════════════════

  private async checkStepPermission(
    stepExecution: any,
    userId: string,
  ): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: stepExecution.processInstance.companyId },
    });

    if (!userCompany) {
      throw new ForbiddenException('Sem permissão para acessar este processo');
    }
  }

  private async checkViewPermission(
    processInstance: any,
    userId: string,
  ): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: processInstance.companyId },
    });

    if (!userCompany) {
      throw new ForbiddenException('Sem permissão para visualizar este processo');
    }
  }

  async uploadAttachment(
    subTaskId: string,
    filePath: string,
    originalName: string,
    fileSize: number,
    mimeType: string,
    userId: string,
    requireSignature: boolean = false,
    signatureType: string = 'SEQUENTIAL',
    signerIds: string[] = [],
  ): Promise<SubTask> {
    const subTask = await this.prisma.subTask.findUnique({
      where: { id: subTaskId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
      },
    });

    if (!subTask) {
      throw new NotFoundException('Sub-tarefa não encontrada');
    }

    await this.checkStepPermission(subTask.stepExecution, userId);

    return this.prisma.subTask.update({
      where: { id: subTaskId },
      data: {
        attachmentPath: filePath,
        attachmentName: originalName,
        attachmentSize: fileSize,
        attachmentMimeType: mimeType,
        requireSignature: requireSignature,
        signatureType: requireSignature ? signatureType : null,
        signers: requireSignature && signerIds.length > 0 ? JSON.stringify(signerIds) : null,
      },
      include: {
        subTaskTemplate: true,
        executor: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getAttachmentForDownload(
    subTaskId: string,
    userId: string,
  ): Promise<{ path: string; filename: string; mimeType: string; size: number }> {
    const subTask = await this.prisma.subTask.findUnique({
      where: { id: subTaskId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
      },
    });

    if (!subTask) {
      throw new NotFoundException('Sub-tarefa não encontrada');
    }

    if (!subTask.attachmentPath || !subTask.attachmentName) {
      throw new NotFoundException('Anexo não encontrado');
    }

    await this.checkViewPermission(subTask.stepExecution.processInstance, userId);

    return {
      path: subTask.attachmentPath,
      filename: subTask.attachmentName,
      mimeType: subTask.attachmentMimeType || 'application/octet-stream',
      size: subTask.attachmentSize || 0,
    };
  }
}
