import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ExecuteStepDto } from './dto/execute-step.dto';
import { ValidateSignatureDto } from './dto/validate-signature.dto';
import {
  ProcessInstance,
  StepExecution,
  ProcessStatus,
  StepExecutionStatus,
  Attachment,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

export interface AttachmentMeta {
  attachmentId: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface UploadResponse {
  success: boolean;
  attachment?: {
    id: string;
    originalName: string;
    size: number;
    mimeType: string;
    fieldName?: string;
  };
  attachments?: Array<{
    id: string;
    originalName: string;
    size: number;
    mimeType: string;
    fieldName?: string;
  }>;
  fieldName?: string;
  count?: number;
}

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  async createInstance(
    createDto: CreateProcessInstanceDto,
    userId: string,
  ): Promise<ProcessInstance> {
    const processType = await this.prisma.processType.findUnique({
      where: { id: createDto.processTypeId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        formFields: { orderBy: { order: 'asc' } },
      },
    });

    if (!processType)
      throw new NotFoundException('Tipo de processo não encontrado');

    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!userCompany)
      throw new BadRequestException(
        'Usuário não está vinculado a nenhuma empresa',
      );

    if (createDto.formData && processType.formFields.length > 0) {
      await this.validateFormData(createDto.formData, processType.formFields);
    }

    const createdInstance = await this.prisma.processInstance.create({
      data: {
        processTypeId: createDto.processTypeId,
        createdById: userId,
        companyId: userCompany.companyId,
        title: createDto.title,
        description: createDto.description,
        formData: createDto.formData ?? undefined,
        metadata: createDto.metadata ?? undefined,
        code: await this.generateProcessCode(),
      },
    });

    const stepExecutionsData = processType.steps.map((step) => {
      const now = new Date();
      const dueAt = step.slaHours
        ? new Date(now.getTime() + step.slaHours * 60 * 60 * 1000)
        : null;

      return {
        processInstanceId: createdInstance.id,
        stepId: step.id,
        status:
          step.order === 1
            ? StepExecutionStatus.IN_PROGRESS
            : StepExecutionStatus.PENDING,
        dueAt: step.order === 1 ? dueAt : null,
      };
    });

    await this.prisma.stepExecution.createMany({
      data: stepExecutionsData,
    });

    return this.findOne(createdInstance.id, userId);
  }

  async uploadProcessFile(
    processInstanceId: string,
    fieldName: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResponse> {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processInstanceId },
      include: {
        processType: {
          include: { formFields: true },
        },
      },
    });

    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.checkViewPermission(process, userId);

    const fileField = process.processType.formFields.find(
      (field) => field.name === fieldName && field.type === 'FILE',
    );

    if (!fileField) {
      throw new BadRequestException('Campo de arquivo não encontrado');
    }

    const stepExecution = await this.prisma.stepExecution.findFirst({
      where: {
        processInstanceId,
        OR: [{ status: 'IN_PROGRESS' }, { step: { order: 1 } }],
      },
      orderBy: { step: { order: 'asc' } },
    });

    if (!stepExecution) {
      throw new BadRequestException('Nenhuma etapa disponível para anexo');
    }

    const attachment: Attachment = await this.prisma.attachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        stepExecutionId: stepExecution.id,
      },
    });

    const currentFormData: Record<string, any> =
      (process.formData as Record<string, any>) || {};
    const attachmentMeta: AttachmentMeta = {
      attachmentId: attachment.id,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
    currentFormData[fieldName] = attachmentMeta;

    await this.prisma.processInstance.update({
      where: { id: processInstanceId },
      data: { formData: currentFormData },
    });

    return {
      success: true,
      attachment: {
        id: attachment.id,
        originalName: attachment.originalName,
        size: attachment.size,
        mimeType: attachment.mimeType,
        fieldName: fieldName,
      },
    };
  }

  async uploadProcessFiles(
    processInstanceId: string,
    fieldName: string,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<UploadResponse> {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processInstanceId },
      include: {
        processType: {
          include: { formFields: true },
        },
      },
    });

    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.checkViewPermission(process, userId);

    const fileField = process.processType.formFields.find(
      (field) => field.name === fieldName && field.type === 'FILE',
    );

    if (!fileField) {
      throw new BadRequestException('Campo de arquivo não encontrado');
    }

    const fieldConfig = this.getFieldFileConfig(fileField);
    if (files.length > fieldConfig.maxFiles) {
      throw new BadRequestException(
        `Máximo ${fieldConfig.maxFiles} arquivo(s) permitido(s) para este campo`,
      );
    }

    const stepExecution = await this.prisma.stepExecution.findFirst({
      where: {
        processInstanceId,
        OR: [{ status: 'IN_PROGRESS' }, { step: { order: 1 } }],
      },
      orderBy: { step: { order: 'asc' } },
    });

    if (!stepExecution) {
      throw new BadRequestException('Nenhuma etapa disponível para anexo');
    }

    const createdAttachments: Attachment[] = [];

    const attachmentPromises: Promise<Attachment>[] = files.map(
      (file: Express.Multer.File) =>
        this.prisma.attachment.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            stepExecutionId: stepExecution.id,
          },
        }),
    );

    const attachments: Attachment[] = await Promise.all(attachmentPromises);
    createdAttachments.push(...attachments);

    const currentFormData: Record<string, any> =
      (process.formData as Record<string, any>) || {};

    if (fieldConfig.multiple && files.length > 1) {
      const attachmentMetas: AttachmentMeta[] = createdAttachments.map(
        (att: Attachment): AttachmentMeta => ({
          attachmentId: att.id,
          originalName: att.originalName,
          size: att.size,
          mimeType: att.mimeType,
        }),
      );
      currentFormData[fieldName] = attachmentMetas;
    } else {
      const firstAttachment: Attachment | undefined = createdAttachments[0];
      if (firstAttachment) {
        const attachmentMeta: AttachmentMeta = {
          attachmentId: firstAttachment.id,
          originalName: firstAttachment.originalName,
          size: firstAttachment.size,
          mimeType: firstAttachment.mimeType,
        };
        currentFormData[fieldName] = attachmentMeta;
      }
    }

    await this.prisma.processInstance.update({
      where: { id: processInstanceId },
      data: { formData: currentFormData },
    });

    return {
      success: true,
      attachments: createdAttachments.map((att: Attachment) => ({
        id: att.id,
        originalName: att.originalName,
        size: att.size,
        mimeType: att.mimeType,
        fieldName: fieldName,
      })),
      fieldName: fieldName,
      count: createdAttachments.length,
    };
  }

  async uploadAttachment(
    stepExecutionId: string,
    file: Express.Multer.File,
    description?: string,
    userId?: string,
  ): Promise<UploadResponse> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: stepExecutionId },
      include: {
        step: true,
        processInstance: true,
      },
    });

    if (!stepExecution) {
      throw new NotFoundException('Execução de etapa não encontrada');
    }

    if (userId) {
      await this.checkViewPermission(stepExecution.processInstance, userId);
    }

    const attachment: Attachment = await this.prisma.attachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        stepExecutionId,
      },
    });

    return {
      success: true,
      attachment: {
        id: attachment.id,
        originalName: attachment.originalName,
        size: attachment.size,
        mimeType: attachment.mimeType,
      },
    };
  }

  async downloadAttachment(
    attachmentId: string,
    userId: string,
    res: Response,
  ): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    await this.checkViewPermission(
      attachment.stepExecution.processInstance,
      userId,
    );

    const filePath = attachment.path;
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado no sistema');
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    );

    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }

  async viewAttachment(
    attachmentId: string,
    userId: string,
    res: Response,
  ): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        stepExecution: {
          include: { processInstance: true },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    await this.checkViewPermission(
      attachment.stepExecution.processInstance,
      userId,
    );

    const filePath = attachment.path;
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado no sistema');
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
    );

    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }

  private getFieldFileConfig(field: any): {
    multiple: boolean;
    maxFiles: number;
    maxSize: number;
    allowedTypes: string[];
  } {
    const defaultConfig = {
      multiple: false,
      maxFiles: 1,
      maxSize: 10 * 1024 * 1024,
      allowedTypes: [
        '.pdf',
        '.jpg',
        '.jpeg',
        '.png',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
      ],
    };

    if (field.validations) {
      try {
        const validations =
          typeof field.validations === 'object'
            ? field.validations
            : JSON.parse(field.validations);

        return {
          multiple: validations.maxFiles
            ? validations.maxFiles > 1
            : defaultConfig.multiple,
          maxFiles: validations.maxFiles || defaultConfig.maxFiles,
          maxSize: validations.maxSize || defaultConfig.maxSize,
          allowedTypes: validations.allowedTypes || defaultConfig.allowedTypes,
        };
      } catch {
        return defaultConfig;
      }
    }

    return defaultConfig;
  }

  async findAll(companyId: string, userId: string, filters: any = {}) {
    const andConditions: Prisma.ProcessInstanceWhereInput[] = [];

    if (filters.status) {
      andConditions.push({ status: filters.status });
    }

    if (filters.processTypeId) {
      andConditions.push({ processTypeId: filters.processTypeId });
    }

    if (filters.search) {
      andConditions.push({
        OR: [
          { code: { contains: filters.search } },
          { title: { contains: filters.search } },
          { description: { contains: filters.search } },
        ],
      });
    }

    const where: Prisma.ProcessInstanceWhereInput = {
      companyId,
      ...(andConditions.length > 0 && { AND: andConditions }),
    };

    const processes = await this.prisma.processInstance.findMany({
      where,
      include: {
        processType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stepExecutions: {
          include: {
            step: {
              select: {
                id: true,
                name: true,
                type: true,
                order: true,
              },
            },
            attachments: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                size: true,
                isSigned: true,
              },
            },
          },
          orderBy: { step: { order: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return processes;
  }

  async findOne(processId: string, userId: string) {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        processType: {
          include: {
            steps: { orderBy: { order: 'asc' } },
            formFields: { orderBy: { order: 'asc' } },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        stepExecutions: {
          include: {
            step: {
              include: {
                assignedToUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                assignedToSector: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            executor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            attachments: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                isSigned: true,
                createdAt: true,
              },
            },
          },
          orderBy: { step: { order: 'asc' } },
        },
      },
    });

    if (!process) throw new NotFoundException('Processo não encontrado');

    await this.checkViewPermission(process, userId);

    return process;
  }

  async getMyTasks(userId: string, companyId: string) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId },
      include: { sector: true },
    });

    const tasks = await this.prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        processInstance: { companyId },
        OR: [
          { step: { assignedToUserId: userId } },
          { step: { assignedToSectorId: userCompany?.sectorId } },
        ],
      },
      include: {
        step: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignedToSector: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        processInstance: {
          include: {
            processType: {
              select: {
                id: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            isSigned: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return tasks;
  }

  async getCreatedByUser(userId: string, companyId: string) {
    return this.prisma.processInstance.findMany({
      where: {
        createdById: userId,
        companyId,
      },
      include: {
        processType: {
          select: {
            id: true,
            name: true,
          },
        },
        stepExecutions: {
          select: {
            id: true,
            status: true,
            step: {
              select: {
                name: true,
                order: true,
              },
            },
          },
          orderBy: { step: { order: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboardStats(userId: string, companyId: string) {
    const [
      totalProcesses,
      activeProcesses,
      completedProcesses,
      myTasks,
      recentProcesses,
    ] = await Promise.all([
      this.prisma.processInstance.count({
        where: { companyId },
      }),
      this.prisma.processInstance.count({
        where: { companyId, status: 'IN_PROGRESS' },
      }),
      this.prisma.processInstance.count({
        where: { companyId, status: 'COMPLETED' },
      }),
      this.getMyTasks(userId, companyId),
      this.prisma.processInstance.findMany({
        where: { companyId },
        include: {
          processType: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalProcesses,
      activeProcesses,
      completedProcesses,
      pendingTasks: myTasks.length,
      recentProcesses,
    };
  }

  async executeStep(
    executeDto: ExecuteStepDto,
    userId: string,
  ): Promise<StepExecution> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: executeDto.stepExecutionId },
      include: {
        step: { include: { assignedToUser: true, assignedToSector: true } },
        processInstance: {
          include: {
            processType: {
              include: {
                steps: { orderBy: { order: 'asc' } },
                formFields: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!stepExecution) {
      throw new NotFoundException('Execução de etapa não encontrada');
    }

    await this.checkExecutePermission(stepExecution, userId);

    if (stepExecution.status !== StepExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta etapa não está em progresso');
    }

    // Processar etapa INPUT com configuração dinâmica
    if (stepExecution.step.type === 'INPUT') {
      return this.executeInputStep(stepExecution, executeDto, userId);
    }

    // Validação de ação para outros tipos
    if (executeDto.action) {
      let allowedActions: string[] = [];

      if (stepExecution.step.type === 'APPROVAL') {
        if (stepExecution.step.actions) {
          try {
            allowedActions = Array.isArray(stepExecution.step.actions)
              ? stepExecution.step.actions
              : JSON.parse(stepExecution.step.actions as any);
          } catch (parseError) {
            allowedActions = ['aprovar', 'reprovar'];
          }
        }

        if (!allowedActions || allowedActions.length === 0) {
          allowedActions = ['aprovar', 'reprovar'];
        }
      } else {
        if (stepExecution.step.actions) {
          try {
            allowedActions = Array.isArray(stepExecution.step.actions)
              ? stepExecution.step.actions
              : JSON.parse(stepExecution.step.actions as any);
          } catch (parseError) {
            console.error('Error parsing actions:', parseError);
            throw new BadRequestException('Erro ao validar ações disponíveis');
          }
        }
      }

      console.log('Action validation:', {
        providedAction: executeDto.action,
        allowedActions: allowedActions,
        stepType: stepExecution.step.type,
      });

      if (
        allowedActions.length > 0 &&
        !allowedActions.includes(executeDto.action)
      ) {
        throw new BadRequestException(
          `Ação "${executeDto.action}" não permitida. Ações disponíveis: ${allowedActions.join(', ')}`,
        );
      }
    }

    if (stepExecution.step.type === 'APPROVAL') {
      if (
        !executeDto.action ||
        !['aprovar', 'reprovar'].includes(executeDto.action)
      ) {
        throw new BadRequestException(
          'Etapa de aprovação requer ação "aprovar" ou "reprovar"',
        );
      }

      if (executeDto.action === 'reprovar' && !executeDto.comment?.trim()) {
        throw new BadRequestException(
          'Reprovação requer justificativa no comentário',
        );
      }
    }

    if (stepExecution.step.requireAttachment) {
      const attachmentCount = await this.prisma.attachment.count({
        where: { stepExecutionId: executeDto.stepExecutionId },
      });
      const minAttachments = stepExecution.step.minAttachments || 1;

      console.log('Checking attachments:', {
        required: stepExecution.step.requireAttachment,
        count: attachmentCount,
        minRequired: minAttachments,
      });

      if (attachmentCount < minAttachments) {
        throw new BadRequestException(
          `Esta etapa requer no mínimo ${minAttachments} anexo(s). Encontrados: ${attachmentCount}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let processedMetadata = executeDto.metadata || {};

      if (stepExecution.step.type === 'APPROVAL') {
        processedMetadata = {
          ...processedMetadata,
          approvalResult: executeDto.action,
          approvalTimestamp: new Date().toISOString(),
          approvalComment: executeDto.comment,
          approvalDecision:
            executeDto.action === 'aprovar' ? 'APPROVED' : 'REJECTED',
        };
      }

      const updatedExecution = await tx.stepExecution.update({
        where: { id: executeDto.stepExecutionId },
        data: {
          status: StepExecutionStatus.COMPLETED,
          action: executeDto.action,
          comment: executeDto.comment,
          metadata: processedMetadata,
          executorId: userId,
          completedAt: new Date(),
        },
      });

      const currentStep = stepExecution.step;
      const allSteps = stepExecution.processInstance.processType.steps;

      let nextStepOrder: number | null = null;
      let shouldEnd = false;
      let finalStatus: ProcessStatus = ProcessStatus.COMPLETED;

      if (stepExecution.step.type === 'APPROVAL') {
        if (executeDto.action === 'reprovar') {
          shouldEnd = true;
          finalStatus = ProcessStatus.REJECTED;
        } else if (executeDto.action === 'aprovar') {
          nextStepOrder = currentStep.order + 1;
        }
      } else if (currentStep.conditions && executeDto.action) {
        try {
          const conditions =
            typeof currentStep.conditions === 'string'
              ? JSON.parse(currentStep.conditions)
              : currentStep.conditions;

          const condition = conditions[executeDto.action];

          if (condition === 'END') {
            shouldEnd = true;
            finalStatus = ProcessStatus.COMPLETED;
          } else if (condition === 'PREVIOUS' && currentStep.order > 1) {
            nextStepOrder = currentStep.order - 1;

            await tx.stepExecution.updateMany({
              where: {
                processInstanceId: stepExecution.processInstanceId,
                step: { order: nextStepOrder },
              },
              data: { status: StepExecutionStatus.IN_PROGRESS },
            });
          } else if (typeof condition === 'number') {
            nextStepOrder = condition;
          } else {
            nextStepOrder = currentStep.order + 1;
          }
        } catch (conditionError) {
          nextStepOrder = currentStep.order + 1;
        }
      } else {
        nextStepOrder = currentStep.order + 1;
      }

      const nextStep = nextStepOrder
        ? allSteps.find((s) => s.order === nextStepOrder)
        : null;

      if (nextStep && !shouldEnd) {
        console.log('Activating next step:', {
          stepId: nextStep.id,
          stepName: nextStep.name,
          order: nextStep.order,
        });

        await tx.stepExecution.updateMany({
          where: {
            processInstanceId: stepExecution.processInstanceId,
            stepId: nextStep.id,
          },
          data: {
            status: StepExecutionStatus.IN_PROGRESS,
            dueAt: nextStep.slaHours
              ? new Date(Date.now() + nextStep.slaHours * 60 * 60 * 1000)
              : null,
          },
        });

        await tx.processInstance.update({
          where: { id: stepExecution.processInstanceId },
          data: { currentStepOrder: nextStepOrder || undefined },
        });
      } else {
        console.log('Process ending:', {
          shouldEnd,
          hasNextStep: !!nextStep,
          action: executeDto.action,
          finalStatus: finalStatus,
        });

        await tx.processInstance.update({
          where: { id: stepExecution.processInstanceId },
          data: {
            status: finalStatus,
            completedAt: new Date(),
          },
        });
      }

      console.log('Step execution completed successfully');
      return updatedExecution;
    });
  }

  // Método específico para executar etapa INPUT
  private async executeInputStep(
    stepExecution: any,
    executeDto: ExecuteStepDto,
    userId: string,
  ): Promise<StepExecution> {
    console.log(
      'Executing INPUT step with conditions:',
      stepExecution.step.conditions,
    );

    // Parsear conditions
    let stepConditions: any = {};
    if (stepExecution.step.conditions) {
      try {
        stepConditions =
          typeof stepExecution.step.conditions === 'string'
            ? JSON.parse(stepExecution.step.conditions)
            : stepExecution.step.conditions;
      } catch (e) {
        console.error('Error parsing step conditions:', e);
      }
    }

    // Validar campos obrigatórios configurados
    if (
      stepConditions.requiredFields &&
      Array.isArray(stepConditions.requiredFields)
    ) {
      for (const fieldName of stepConditions.requiredFields) {
        if (
          !executeDto.metadata ||
          executeDto.metadata[fieldName] === undefined ||
          executeDto.metadata[fieldName] === ''
        ) {
          const field =
            stepExecution.processInstance.processType.formFields.find(
              (f: any) => f.name === fieldName,
            );
          const label = field?.label || fieldName;
          throw new BadRequestException(
            `Campo "${label}" é obrigatório nesta etapa`,
          );
        }
      }
    }

    // Validar overrides se existirem
    if (stepConditions.overrides) {
      for (const [fieldName, override] of Object.entries(
        stepConditions.overrides,
      )) {
        const value = executeDto.metadata?.[fieldName];
        const overrideConfig = override as any;

        if (value !== undefined && value !== '') {
          if (overrideConfig.regex) {
            const regex = new RegExp(overrideConfig.regex);
            if (!regex.test(value)) {
              throw new BadRequestException(
                overrideConfig.errorMessage ||
                  `Campo "${fieldName}" está em formato inválido`,
              );
            }
          }

          if (
            overrideConfig.min !== undefined &&
            Number(value) < overrideConfig.min
          ) {
            throw new BadRequestException(
              `Campo "${fieldName}" deve ser maior ou igual a ${overrideConfig.min}`,
            );
          }

          if (
            overrideConfig.max !== undefined &&
            Number(value) > overrideConfig.max
          ) {
            throw new BadRequestException(
              `Campo "${fieldName}" deve ser menor ou igual a ${overrideConfig.max}`,
            );
          }
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Mesclar dados do formulário com formData do processo
      const currentFormData =
        (stepExecution.processInstance.formData as any) || {};
      const newFormData = { ...currentFormData };

      // Atualizar apenas campos visíveis nesta etapa
      if (
        stepConditions.visibleFields &&
        Array.isArray(stepConditions.visibleFields)
      ) {
        for (const fieldName of stepConditions.visibleFields) {
          if (
            executeDto.metadata &&
            executeDto.metadata[fieldName] !== undefined
          ) {
            newFormData[fieldName] = executeDto.metadata[fieldName];
          }
        }
      } else {
        // Se não há configuração de campos visíveis, aceitar todos
        Object.assign(newFormData, executeDto.metadata || {});
      }

      // Atualizar formData do processo
      await tx.processInstance.update({
        where: { id: stepExecution.processInstanceId },
        data: { formData: newFormData },
      });

      // Preparar metadata da execução
      const executionMetadata: any = {
        fieldsUpdated: Object.keys(executeDto.metadata || {}),
        timestamp: new Date().toISOString(),
      };

      // Adicionar campos locais da etapa ao metadata se existirem
      if (stepConditions.stepLocalFields && executeDto.metadata) {
        executionMetadata.stepLocalData = {};
        for (const localField of stepConditions.stepLocalFields) {
          if (executeDto.metadata[localField] !== undefined) {
            executionMetadata.stepLocalData[localField] =
              executeDto.metadata[localField];
            // Remover do formData principal (fica só no metadata da etapa)
            delete newFormData[localField];
          }
        }
      }

      // Definir ação padrão se não fornecida
      const action = executeDto.action || 'concluir';

      // Verificar se há ações configuradas para INPUT, senão usar padrão
      let allowedActions: string[] = ['concluir'];
      if (stepExecution.step.actions) {
        try {
          const parsedActions = Array.isArray(stepExecution.step.actions)
            ? stepExecution.step.actions
            : JSON.parse(stepExecution.step.actions as any);
          if (parsedActions && parsedActions.length > 0) {
            allowedActions = parsedActions;
          }
        } catch (e) {
          console.log('Using default actions for INPUT step');
        }
      }

      // Atualizar execução da etapa
      const updatedExecution = await tx.stepExecution.update({
        where: { id: executeDto.stepExecutionId },
        data: {
          status: StepExecutionStatus.COMPLETED,
          action: action,
          comment: executeDto.comment,
          metadata: executionMetadata,
          executorId: userId,
          completedAt: new Date(),
        },
      });

      // Avançar para próxima etapa
      const currentStep = stepExecution.step;
      const allSteps = stepExecution.processInstance.processType.steps;
      const nextStepOrder = currentStep.order + 1;
      const nextStep = allSteps.find((s: any) => s.order === nextStepOrder);

      if (nextStep) {
        await tx.stepExecution.updateMany({
          where: {
            processInstanceId: stepExecution.processInstanceId,
            stepId: nextStep.id,
          },
          data: {
            status: StepExecutionStatus.IN_PROGRESS,
            dueAt: nextStep.slaHours
              ? new Date(Date.now() + nextStep.slaHours * 60 * 60 * 1000)
              : null,
          },
        });

        await tx.processInstance.update({
          where: { id: stepExecution.processInstanceId },
          data: { currentStepOrder: nextStepOrder },
        });
      } else {
        // Finalizar processo se não há próxima etapa
        await tx.processInstance.update({
          where: { id: stepExecution.processInstanceId },
          data: {
            status: ProcessStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      return updatedExecution;
    });
  }

  async validateAndSign(
    stepExecutionId: string,
    attachmentId: string,
    validateDto: ValidateSignatureDto,
    userId: string,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const isPasswordValid = await bcrypt.compare(
      validateDto.password,
      user.password,
    );
    if (!isPasswordValid) throw new UnauthorizedException('Senha inválida');

    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { stepExecution: { include: { step: true } } },
    });

    if (!attachment) throw new NotFoundException('Anexo não encontrado');
    if (attachment.stepExecutionId !== stepExecutionId)
      throw new BadRequestException('Anexo não pertence a esta etapa');
    if (!attachment.stepExecution.step.requiresSignature)
      throw new BadRequestException('Esta etapa não requer assinatura');
    if (attachment.isSigned)
      throw new BadRequestException('Este documento já foi assinado');

    const updatedAttachment = await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { isSigned: true, signedPath: `signed-${attachment.filename}` },
    });

    await this.prisma.stepExecution.update({
      where: { id: stepExecutionId },
      data: { signedAt: new Date() },
    });

    return { attachment: updatedAttachment };
  }

  private async generateProcessCode(): Promise<string> {
    const year = new Date().getFullYear();
    const lastProcess = await this.prisma.processInstance.findFirst({
      where: { code: { startsWith: `PROC-${year}-` } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastProcess) {
      const lastNumber = parseInt(lastProcess.code.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `PROC-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }

  private async checkViewPermission(
    instance: any,
    userId: string,
  ): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: instance.companyId },
    });
    if (!userCompany)
      throw new ForbiddenException(
        'Sem permissão para visualizar este processo',
      );
  }

  private async checkExecutePermission(
    stepExecution: any,
    userId: string,
  ): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: stepExecution.processInstance.companyId },
    });
    if (!userCompany) throw new ForbiddenException('Sem permissão');

    const step = stepExecution.step;
    if (step.assignedToUserId === userId) return;
    if (
      step.assignedToSectorId &&
      userCompany.sectorId === step.assignedToSectorId
    )
      return;
    if (userCompany.role === 'ADMIN') return;

    throw new ForbiddenException('Sem permissão para executar esta etapa');
  }

  private async validateFormData(
    formData: Record<string, any>,
    formFields: any[],
  ): Promise<void> {
    for (const field of formFields) {
      if (field.type === 'FILE') {
        continue;
      }

      const value = formData[field.name];
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        throw new BadRequestException(`Campo "${field.label}" é obrigatório`);
      }
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'EMAIL':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
              throw new BadRequestException(
                `Campo "${field.label}" deve ser um email válido`,
              );
            break;
          case 'CPF':
            if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value))
              throw new BadRequestException(
                `Campo "${field.label}" deve ser um CPF válido`,
              );
            break;
          case 'CNPJ':
            if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value))
              throw new BadRequestException(
                `Campo "${field.label}" deve ser um CNPJ válido`,
              );
            break;
          case 'NUMBER':
            if (isNaN(Number(value)))
              throw new BadRequestException(
                `Campo "${field.label}" deve ser um número`,
              );
            break;
          case 'DATE':
            if (isNaN(Date.parse(value)))
              throw new BadRequestException(
                `Campo "${field.label}" deve ser uma data válida`,
              );
            break;
        }
        if (field.validations) {
          const validations =
            typeof field.validations === 'string'
              ? JSON.parse(field.validations)
              : field.validations;

          if (validations.minLength && value.length < validations.minLength)
            throw new BadRequestException(
              validations.customMessage ||
                `Campo "${field.label}" deve ter no mínimo ${validations.minLength} caracteres`,
            );
          if (validations.maxLength && value.length > validations.maxLength)
            throw new BadRequestException(
              validations.customMessage ||
                `Campo "${field.label}" deve ter no máximo ${validations.maxLength} caracteres`,
            );
          if (validations.min && Number(value) < validations.min)
            throw new BadRequestException(
              validations.customMessage ||
                `Campo "${field.label}" deve ser maior ou igual a ${validations.min}`,
            );
          if (validations.max && Number(value) > validations.max)
            throw new BadRequestException(
              validations.customMessage ||
                `Campo "${field.label}" deve ser menor ou igual a ${validations.max}`,
            );
          if (
            validations.pattern &&
            !new RegExp(validations.pattern).test(value)
          )
            throw new BadRequestException(
              validations.customMessage ||
                `Campo "${field.label}" não está no formato correto`,
            );
        }
      }
    }
  }
}
