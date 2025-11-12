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
    // Buscar ProcessType e sua versão ativa
    const processType = await this.prisma.processType.findUnique({
      where: { id: createDto.processTypeId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            steps: { orderBy: { order: 'asc' } },
            formFields: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!processType || !processType.versions.length)
      throw new NotFoundException('Tipo de processo não encontrado ou sem versão ativa');

    const activeVersion = processType.versions[0];

    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!userCompany)
      throw new BadRequestException(
        'Usuário não está vinculado a nenhuma empresa',
      );

    if (createDto.formData && activeVersion.formFields.length > 0) {
      await this.validateFormData(createDto.formData, activeVersion.formFields);
    }

    const createdInstance = await this.prisma.processInstance.create({
      data: {
        processTypeVersionId: activeVersion.id,
        createdById: userId,
        companyId: userCompany.companyId,
        title: createDto.title,
        description: createDto.description,
        formData: createDto.formData ?? undefined,
        metadata: createDto.metadata ?? undefined,
        code: await this.generateProcessCode(),
      },
    });

    // INÍCIO DA SEÇÃO ATUALIZADA
    const stepExecutionsData = activeVersion.steps.map((step) => {
      const now = new Date();
      // Converter slaDays para horas se disponível
      const slaHours = step.slaDays ? step.slaDays * 24 : step.slaHours;
      const dueAt = slaHours
        ? new Date(now.getTime() + slaHours * 60 * 60 * 1000)
        : null;

      return {
        processInstanceId: createdInstance.id,
        stepVersionId: step.id,
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

    // Criar assignments para o criador onde necessário
    for (const step of activeVersion.steps) {
      if (step.assignedToCreator) {
        await this.prisma.stepAssignment.create({
          data: {
            stepVersionId: step.id,
            type: 'USER',
            userId: userId, // Atribuir ao criador
            priority: 1,
            isActive: true,
            dynamicRole: 'PROCESS_CREATOR',
          },
        });
      }
    }
    // FIM DA SEÇÃO ATUALIZADA

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
        processTypeVersion: {
          include: { formFields: true },
        },
      },
    });

    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.checkViewPermission(process, userId);

    const fileField = process.processTypeVersion.formFields.find(
      (field) => field.name === fieldName && field.type === 'FILE',
    );

    if (!fileField) {
      throw new BadRequestException('Campo de arquivo não encontrado');
    }

    const stepExecution = await this.prisma.stepExecution.findFirst({
      where: {
        processInstanceId,
        OR: [{ status: 'IN_PROGRESS' }, { stepVersion: { order: 1 } }],
      },
      include: { stepVersion: true },
      orderBy: { stepVersion: { order: 'asc' } },
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
        processTypeVersion: {
          include: { formFields: true },
        },
      },
    });

    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.checkViewPermission(process, userId);

    const fileField = process.processTypeVersion.formFields.find(
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
        OR: [{ status: 'IN_PROGRESS' }, { stepVersion: { order: 1 } }],
      },
      include: { stepVersion: true },
      orderBy: { stepVersion: { order: 'asc' } },
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
        stepVersion: true,
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
      andConditions.push({ processTypeVersion: { processTypeId: filters.processTypeId } });
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
        processTypeVersion: {
          select: {
            id: true,
            processType: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
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
            stepVersion: {
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
          orderBy: { stepVersion: { order: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Adaptar resposta para manter compatibilidade
    return processes.map(process => ({
      ...process,
      processType: process.processTypeVersion.processType,
      stepExecutions: process.stepExecutions.map(se => ({
        ...se,
        step: se.stepVersion,
      })),
    }));
  }

  async findOne(processId: string, userId: string) {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        processTypeVersion: {
          include: {
            processType: true,
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
            stepVersion: {
              include: {
                assignments: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                    sector: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                signatureRequirements: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                    signatureRecords: {
                      select: {
                        id: true,
                        status: true,
                        signerId: true,
                        requirementId: true,
                      },
                    },
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
              include: {
                signatureRecords: {
                  select: {
                    id: true,
                    status: true,
                    signerId: true,
                    requirementId: true,
                  },
                },
              },
            },
          },
          orderBy: { stepVersion: { order: 'asc' } },
        },
      },
    });

    if (!process) throw new NotFoundException('Processo não encontrado');

    await this.checkViewPermission(process, userId);

    // Adaptar resposta para manter compatibilidade
    return {
      ...process,
      processType: {
        ...process.processTypeVersion.processType,
        steps: process.processTypeVersion.steps,
        formFields: process.processTypeVersion.formFields,
      },
      stepExecutions: process.stepExecutions.map(se => {
        const userAssignment = se.stepVersion.assignments?.find(a => a.type === 'USER');
        const sectorAssignment = se.stepVersion.assignments?.find(a => a.type === 'SECTOR');
        
        return {
          ...se,
          step: {
            ...se.stepVersion,
            assignedToUser: userAssignment?.user || null,
            assignedToSector: sectorAssignment?.sector || null,
          },
        };
      }),
    };
  }

  async cancelProcess(processId: string, user: any, reason?: string) {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        processTypeVersion: {
          include: {
            processType: true,
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
          orderBy: { stepVersion: { order: 'asc' } },
        },
      },
    });

    if (!process) {
      throw new NotFoundException('Processo nao encontrado');
    }

    await this.checkViewPermission(process, user.id);

    const terminalStatuses: ProcessStatus[] = [
      ProcessStatus.COMPLETED,
      ProcessStatus.CANCELLED,
      ProcessStatus.REJECTED,
    ];

    if (terminalStatuses.includes(process.status)) {
      throw new BadRequestException('Processo ja finalizado; cancelamento nao permitido');
    }

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId: user.id,
        companyId: process.companyId,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('Sem permissao para cancelar este processo');
    }

    const isCreator = process.createdById === user.id;
    const isCompanyManager = ['ADMIN', 'MANAGER'].includes(userCompany.role);
    const hasManagePermission = this.userHasPermission(user, 'processes', 'manage');

    if (!isCreator && !isCompanyManager && !hasManagePermission) {
      throw new ForbiddenException('Somente o criador ou usuarios autorizados podem cancelar o processo');
    }

    const normalizedReason = reason?.trim() ? reason.trim() : null;
    const cancellationDate = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.stepExecution.updateMany({
        where: {
          processInstanceId: process.id,
          status: {
            in: [StepExecutionStatus.IN_PROGRESS, StepExecutionStatus.PENDING],
          },
        },
        data: {
          status: StepExecutionStatus.SKIPPED,
          completedAt: cancellationDate,
        },
      });

      const baseMetadata =
        process.metadata &&
        typeof process.metadata === 'object' &&
        !Array.isArray(process.metadata)
          ? { ...(process.metadata as Record<string, any>) }
          : {};

      baseMetadata.cancellation = {
        byUserId: user.id,
        byUserName: user.name ?? null,
        byUserEmail: user.email ?? null,
        at: cancellationDate.toISOString(),
        reason: normalizedReason,
        previousStatus: process.status,
      };

      await tx.processInstance.update({
        where: { id: process.id },
        data: {
          status: ProcessStatus.CANCELLED,
          completedAt: cancellationDate,
          metadata: baseMetadata as Prisma.InputJsonValue,
        },
      });
    });

    return this.findOne(processId, user.id);
  }
  
  // INÍCIO DA SEÇÃO ATUALIZADA
  async getMyTasks(userId: string, companyId: string) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId },
      include: { sector: true },
    });

    // 1. Buscar tarefas normais (IN_PROGRESS) através dos assignments
    const normalTasks = await this.prisma.stepExecution.findMany({
      where: {
        status: 'IN_PROGRESS',
        processInstance: { companyId },
        OR: [
          // Atribuição direta ao usuário
          {
            stepVersion: {
              assignments: {
                some: {
                  type: 'USER',
                  userId: userId,
                  isActive: true,
                },
              },
            },
          },
          // Atribuição ao setor do usuário
          {
            stepVersion: {
              assignments: {
                some: {
                  type: 'SECTOR',
                  sectorId: userCompany?.sectorId,
                  isActive: true,
                },
              },
            },
          },
          // Tarefas atribuídas ao criador
          {
            AND: [
              {
                stepVersion: {
                  assignedToCreator: true,
                },
              },
              {
                processInstance: {
                  createdById: userId,
                },
              },
            ],
          },
        ],
      },
      include: {
        stepVersion: {
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                sector: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        processInstance: {
          include: {
            processTypeVersion: {
              include: {
                processType: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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

    // 2. Buscar assinaturas pendentes (COMPLETED ou qualquer status) separadamente
    // IMPORTANTE: Filtra apenas execuções com anexos PDF não assinados
    // Isso resolve o problema de assinaturas PARALLEL aparecerem mesmo sem anexos
    const signatureTasks = await this.prisma.stepExecution.findMany({
      where: {
        processInstance: { companyId },
        stepVersion: {
          signatureRequirements: {
            some: {
              userId: userId,
              signatureRecords: {
                none: {
                  signerId: userId,
                  status: 'COMPLETED',
                },
              },
            },
          },
        },
        // Filtro crucial: execução DEVE ter anexos PDF não assinados
        // Sem isso, execuções PARALLEL sem anexos são retornadas incorretamente
        attachments: {
          some: {
            mimeType: 'application/pdf',
            isSigned: false
          }
        }
      },
      include: {
        stepVersion: {
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                sector: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        processInstance: {
          include: {
            processTypeVersion: {
              include: {
                processType: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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

    console.log(`Found ${normalTasks.length} normal tasks and ${signatureTasks.length} signature tasks`);

    // 3. Combinar resultados, removendo duplicatas
    const taskIds = new Set<string>();
    const allTasks: typeof normalTasks = [];

    for (const task of normalTasks) {
      if (!taskIds.has(task.id)) {
        taskIds.add(task.id);
        allTasks.push(task);
      }
    }

    for (const task of signatureTasks) {
      if (!taskIds.has(task.id)) {
        taskIds.add(task.id);
        allTasks.push(task);
      }
    }

    // Adaptar resposta para incluir informação se é atribuída ao criador
    return allTasks.map(task => {
      const isAssignedToCreator = task.stepVersion.assignedToCreator && 
                                  task.processInstance.createdById === userId;
      
      const userAssignment = task.stepVersion.assignments?.find(a => a.type === 'USER');
      const sectorAssignment = task.stepVersion.assignments?.find(a => a.type === 'SECTOR');
      
      return {
        ...task,
        step: {
          ...task.stepVersion,
          assignedToUser: isAssignedToCreator 
            ? task.processInstance.createdBy 
            : (userAssignment?.user || null),
          assignedToSector: sectorAssignment?.sector || null,
          assignedToCreator: task.stepVersion.assignedToCreator || false,
        },
        processInstance: {
          ...task.processInstance,
          processType: task.processInstance.processTypeVersion.processType,
        },
      };
    });
  }
  // FIM DA SEÇÃO ATUALIZADA

  async getCreatedByUser(userId: string, companyId: string) {
    const processes = await this.prisma.processInstance.findMany({
      where: {
        createdById: userId,
        companyId,
      },
      include: {
        processTypeVersion: {
          include: {
            processType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        stepExecutions: {
          select: {
            id: true,
            status: true,
            stepVersion: {
              select: {
                name: true,
                order: true,
              },
            },
          },
          orderBy: { stepVersion: { order: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Adaptar resposta para manter compatibilidade
    return processes.map(process => ({
      ...process,
      processType: process.processTypeVersion.processType,
      stepExecutions: process.stepExecutions.map(se => ({
        ...se,
        step: se.stepVersion,
      })),
    }));
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
          processTypeVersion: {
            include: {
              processType: { select: { name: true } },
            },
          },
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
      recentProcesses: recentProcesses.map(process => ({
        ...process,
        processType: process.processTypeVersion.processType,
      })),
    };
  }

  async executeStep(
    executeDto: ExecuteStepDto,
    userId: string,
  ): Promise<StepExecution> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: executeDto.stepExecutionId },
      include: {
        stepVersion: { 
          include: { 
            assignments: {
              include: {
                user: true,
                sector: true,
              },
            },
          },
        },
        processInstance: {
          include: {
            processTypeVersion: {
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

    // Permitir executar etapas PENDING ou IN_PROGRESS
    if (stepExecution.status !== StepExecutionStatus.IN_PROGRESS && stepExecution.status !== StepExecutionStatus.PENDING) {
      throw new BadRequestException('Esta etapa não está disponível para execução');
    }

    // Se está PENDING, atualizar para IN_PROGRESS antes de executar
    if (stepExecution.status === StepExecutionStatus.PENDING) {
      await this.prisma.stepExecution.update({
        where: { id: executeDto.stepExecutionId },
        data: { status: StepExecutionStatus.IN_PROGRESS },
      });
    }

    // Processar etapa INPUT com configuração dinâmica
    if (stepExecution.stepVersion.type === 'INPUT') {
      return this.executeInputStep(stepExecution, executeDto, userId);
    }

    // Validação de ação para outros tipos
    if (executeDto.action) {
      let allowedActions: string[] = [];

      if (stepExecution.stepVersion.type === 'APPROVAL') {
        allowedActions = ['aprovar', 'reprovar'];
      }

      console.log('Action validation:', {
        providedAction: executeDto.action,
        allowedActions: allowedActions,
        stepType: stepExecution.stepVersion.type,
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

    if (stepExecution.stepVersion.type === 'APPROVAL') {
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

    if (stepExecution.stepVersion.requireAttachment) {
      const attachmentCount = await this.prisma.attachment.count({
        where: { stepExecutionId: executeDto.stepExecutionId },
      });
      const minAttachments = stepExecution.stepVersion.minAttachments || 1;

      console.log('Checking attachments:', {
        required: stepExecution.stepVersion.requireAttachment,
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

      if (stepExecution.stepVersion.type === 'APPROVAL') {
        processedMetadata = {
          ...processedMetadata,
          approvalResult: executeDto.action,
          approvalTimestamp: new Date().toISOString(),
          approvalComment: executeDto.comment,
          approvalDecision:
            executeDto.action === 'aprovar' ? 'APPROVED' : 'REJECTED',
        };
      }

      // Marcar etapa como concluída normalmente
      // As assinaturas ficam pendentes como atividade separada
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

      const currentStep = stepExecution.stepVersion;
      const allSteps = stepExecution.processInstance.processTypeVersion.steps;

      let nextStepOrder: number | null = null;
      let shouldEnd = false;
      let finalStatus: ProcessStatus = ProcessStatus.COMPLETED;

      if (stepExecution.stepVersion.type === 'APPROVAL') {
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
              ? JSON.parse(currentStep.conditions as string)
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
                stepVersion: { order: nextStepOrder },
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

      // Avançar para próxima etapa normalmente
      if (nextStep && !shouldEnd) {
        console.log('Activating next step:', {
          stepId: nextStep.id,
          stepName: nextStep.name,
          order: nextStep.order,
        });

        await tx.stepExecution.updateMany({
          where: {
            processInstanceId: stepExecution.processInstanceId,
            stepVersionId: nextStep.id,
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
      stepExecution.stepVersion.conditions,
    );

    // Parsear conditions
    let stepConditions: any = {};
    if (stepExecution.stepVersion.conditions) {
      try {
        stepConditions =
          typeof stepExecution.stepVersion.conditions === 'string'
            ? JSON.parse(stepExecution.stepVersion.conditions as string)
            : stepExecution.stepVersion.conditions;
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
            stepExecution.processInstance.processTypeVersion.formFields.find(
              (f: any) => f.name === fieldName,
            );
          const label = field?.label || fieldName;
          throw new BadRequestException(
            `Campo "${label}" é obrigatório nesta etapa`,
          );
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

      // Definir ação padrão se não fornecida
      const action = executeDto.action || 'concluir';

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
      const currentStep = stepExecution.stepVersion;
      const allSteps = stepExecution.processInstance.processTypeVersion.steps;
      const nextStepOrder = currentStep.order + 1;
      const nextStep = allSteps.find((s: any) => s.order === nextStepOrder);

      if (nextStep) {
        await tx.stepExecution.updateMany({
          where: {
            processInstanceId: stepExecution.processInstanceId,
            stepVersionId: nextStep.id,
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
      include: { 
        stepExecution: { 
          include: { 
            stepVersion: true 
          } 
        } 
      },
    });

    if (!attachment) throw new NotFoundException('Anexo não encontrado');
    if (attachment.stepExecutionId !== stepExecutionId)
      throw new BadRequestException('Anexo não pertence a esta etapa');
    if (!attachment.stepExecution.stepVersion.requiresSignature)
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

  // INÍCIO DA SEÇÃO ATUALIZADA
  private async checkExecutePermission(
    stepExecution: any,
    userId: string,
  ): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: stepExecution.processInstance.companyId },
    });
    
    if (!userCompany) throw new ForbiddenException('Sem permissão');
  
    // Verificar se é atribuída ao criador
    if (stepExecution.stepVersion.assignedToCreator) {
      if (stepExecution.processInstance.createdById === userId) {
        return; // Permitir se o usuário é o criador
      }
    }
  
    // Verificar assignments normais
    const userAssignment = stepExecution.stepVersion.assignments?.find(
      (a: any) => a.type === 'USER' && a.userId === userId && a.isActive
    );
    
    const sectorAssignment = stepExecution.stepVersion.assignments?.find(
      (a: any) => a.type === 'SECTOR' && a.sectorId === userCompany.sectorId && a.isActive
    );
  
    if (userAssignment || sectorAssignment) return;
    if (userCompany.role === 'ADMIN') return;
  
    throw new ForbiddenException('Sem permissão para executar esta etapa');
  }
  // FIM DA SEÇÃO ATUALIZADA

  private userHasPermission(user: any, resource: string, action: string): boolean {
    if (!user?.permissions || !Array.isArray(user.permissions)) {
      return false;
    }

    const normalizedResource = resource.toLowerCase();
    const normalizedAction = action.toLowerCase();

    return user.permissions.some((permission: any) => {
      const permResource = String(permission.resource || '*').toLowerCase();
      const permAction = String(permission.action || '*').toLowerCase();

      return (
        (permResource === '*' || permResource === normalizedResource) &&
        (permAction === '*' || permAction === normalizedAction)
      );
    });
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
