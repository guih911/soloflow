import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ExecuteStepDto } from './dto/execute-step.dto';
import { ValidateSignatureDto } from './dto/validate-signature.dto';
import {  ProcessInstance, StepExecution, ProcessStatus, StepExecutionStatus, Attachment } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

// ✅ Tipo para metadata de anexo
export interface AttachmentMeta {
  attachmentId: string;
  originalName: string;
  size: number;
  mimeType: string;
}

// ✅ Interface para resposta de upload
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

  // ✅ MÉTODO REFATORADO: Criar processo apenas com dados JSON
  async createInstance(
    createDto: CreateProcessInstanceDto, 
    userId: string
  ): Promise<ProcessInstance> {
    const processType = await this.prisma.processType.findUnique({
      where: { id: createDto.processTypeId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        formFields: { orderBy: { order: 'asc' } },
      },
    });

    if (!processType) throw new NotFoundException('Tipo de processo não encontrado');

    // Buscar companyId do usuário
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId },
      include: { company: true },
    });

    if (!userCompany) throw new BadRequestException('Usuário não está vinculado a nenhuma empresa');

    // ✅ CRÍTICO: Validar apenas campos não-arquivo no formData
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

    // Criar step executions
    const stepExecutionsData = processType.steps.map((step) => {
      const now = new Date();
      const dueAt = step.slaHours ? new Date(now.getTime() + (step.slaHours * 60 * 60 * 1000)) : null;
      
      return {
        processInstanceId: createdInstance.id,
        stepId: step.id,
        status: step.order === 1 ? StepExecutionStatus.IN_PROGRESS : StepExecutionStatus.PENDING,
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
    userId: string
  ): Promise<UploadResponse> {
    // Verificar se o processo existe e se o usuário tem permissão
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processInstanceId },
      include: { 
        processType: { 
          include: { formFields: true } 
        } 
      }
    });

    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.checkViewPermission(process, userId);

    // Verificar se existe um campo FILE com esse nome
    const fileField = process.processType.formFields.find(
      field => field.name === fieldName && field.type === 'FILE'
    );

    if (!fileField) {
      throw new BadRequestException('Campo de arquivo não encontrado');
    }

    // Buscar a step execution ativa ou primeira
    const stepExecution = await this.prisma.stepExecution.findFirst({
      where: { 
        processInstanceId,
        OR: [
          { status: 'IN_PROGRESS' },
          { step: { order: 1 } }
        ]
      },
      orderBy: { step: { order: 'asc' } }
    });

    if (!stepExecution) {
      throw new BadRequestException('Nenhuma etapa disponível para anexo');
    }

    // Criar o anexo
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

    // ✅ CRÍTICO: Atualizar formData do processo com referência ao arquivo
    const currentFormData: Record<string, any> = (process.formData as Record<string, any>) || {};
    const attachmentMeta: AttachmentMeta = {
      attachmentId: attachment.id,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    };
    currentFormData[fieldName] = attachmentMeta;

    await this.prisma.processInstance.update({
      where: { id: processInstanceId },
      data: { formData: currentFormData }
    });

    return {
      success: true,
      attachment: {
        id: attachment.id,
        originalName: attachment.originalName,
        size: attachment.size,
        mimeType: attachment.mimeType,
        fieldName: fieldName
      }
    };
  }

  // ✅ NOVO: Upload de múltiplos arquivos para campo específico
  async uploadProcessFiles(
    processInstanceId: string,
    fieldName: string,
    files: Express.Multer.File[],
    userId: string
  ): Promise<UploadResponse> {
    // Verificar se o processo existe e se o usuário tem permissão
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processInstanceId },
      include: { 
        processType: { 
          include: { formFields: true } 
        } 
      }
    });

    if (!process) throw new NotFoundException('Processo não encontrado');
    await this.checkViewPermission(process, userId);

    // Verificar se existe um campo FILE com esse nome
    const fileField = process.processType.formFields.find(
      field => field.name === fieldName && field.type === 'FILE'
    );

    if (!fileField) {
      throw new BadRequestException('Campo de arquivo não encontrado');
    }

    // Verificar limitações do campo
    const fieldConfig = this.getFieldFileConfig(fileField);
    if (files.length > fieldConfig.maxFiles) {
      throw new BadRequestException(`Máximo ${fieldConfig.maxFiles} arquivo(s) permitido(s) para este campo`);
    }

    // Buscar a step execution ativa ou primeira
    const stepExecution = await this.prisma.stepExecution.findFirst({
      where: { 
        processInstanceId,
        OR: [
          { status: 'IN_PROGRESS' },
          { step: { order: 1 } }
        ]
      },
      orderBy: { step: { order: 'asc' } }
    });

    if (!stepExecution) {
      throw new BadRequestException('Nenhuma etapa disponível para anexo');
    }

    const createdAttachments: Attachment[] = [];

    // Criar anexos para cada arquivo
    const attachmentPromises: Promise<Attachment>[] = files.map((file: Express.Multer.File) => 
      this.prisma.attachment.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          stepExecutionId: stepExecution.id,
        },
      })
    );

    // ✅ AGUARDAR TODOS OS UPLOADS COM TIPAGEM
    const attachments: Attachment[] = await Promise.all(attachmentPromises);
    createdAttachments.push(...attachments);

    // ✅ CRÍTICO: Atualizar formData com referência aos arquivos
    const currentFormData: Record<string, any> = (process.formData as Record<string, any>) || {};
    
    if (fieldConfig.multiple && files.length > 1) {
      // Campo múltiplo: array de referências
      const attachmentMetas: AttachmentMeta[] = createdAttachments.map((att: Attachment): AttachmentMeta => ({
        attachmentId: att.id,
        originalName: att.originalName,
        size: att.size,
        mimeType: att.mimeType
      }));
      currentFormData[fieldName] = attachmentMetas;
    } else {
      // Campo único: apenas primeira referência
      const firstAttachment: Attachment | undefined = createdAttachments[0];
      if (firstAttachment) {
        const attachmentMeta: AttachmentMeta = {
          attachmentId: firstAttachment.id,
          originalName: firstAttachment.originalName,
          size: firstAttachment.size,
          mimeType: firstAttachment.mimeType
        };
        currentFormData[fieldName] = attachmentMeta;
      }
    }

    await this.prisma.processInstance.update({
      where: { id: processInstanceId },
      data: { formData: currentFormData }
    });

    return {
      success: true,
      attachments: createdAttachments.map((att: Attachment) => ({
        id: att.id,
        originalName: att.originalName,
        size: att.size,
        mimeType: att.mimeType,
        fieldName: fieldName
      })),
      fieldName: fieldName,
      count: createdAttachments.length
    };
  }
  async uploadAttachment(
    stepExecutionId: string,
    file: Express.Multer.File,
    description?: string,
    userId?: string
  ): Promise<UploadResponse> {
    const stepExecution = await this.prisma.stepExecution.findUnique({
      where: { id: stepExecutionId },
      include: { 
        step: true,
        processInstance: true 
      }
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
        mimeType: attachment.mimeType
      }
    };
  }
  async downloadAttachment(
    attachmentId: string,
    userId: string,
    res: Response
  ): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { 
        stepExecution: { 
          include: { processInstance: true } 
        } 
      }
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Verificar permissão
    await this.checkViewPermission(attachment.stepExecution.processInstance, userId);

    // Verificar se arquivo existe
    const filePath = attachment.path;
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado no sistema');
    }

    // Configurar headers para download
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename="${encodeURIComponent(attachment.originalName)}"`
    );

    // Enviar arquivo
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }

  // ✅ NOVO: Visualizar anexo (inline)
  async viewAttachment(
    attachmentId: string,
    userId: string,
    res: Response
  ): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { 
        stepExecution: { 
          include: { processInstance: true } 
        } 
      }
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Verificar permissão
    await this.checkViewPermission(attachment.stepExecution.processInstance, userId);

    // Verificar se arquivo existe
    const filePath = attachment.path;
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado no sistema');
    }

    // Configurar headers para visualização inline
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition', 
      `inline; filename="${encodeURIComponent(attachment.originalName)}"`
    );

    // Enviar arquivo
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
  }

  // ✅ Método auxiliar para configurações de campo de arquivo
  private getFieldFileConfig(field: any): { multiple: boolean; maxFiles: number; maxSize: number; allowedTypes: string[] } {
    const defaultConfig = {
      multiple: false,
      maxFiles: 1,
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
    };

    if (field.validations) {
      try {
        const validations = typeof field.validations === 'object' ? 
          field.validations : JSON.parse(field.validations);
        
        return {
          multiple: validations.maxFiles ? validations.maxFiles > 1 : defaultConfig.multiple,
          maxFiles: validations.maxFiles || defaultConfig.maxFiles,
          maxSize: validations.maxSize || defaultConfig.maxSize,
          allowedTypes: validations.allowedTypes || defaultConfig.allowedTypes
        };
      } catch {
        return defaultConfig;
      }
    }

    return defaultConfig;
  }

  //    Listar todos os processos da empresa
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
          { code: { contains: filters.search}},
          { title: { contains: filters.search} },
          { description: { contains: filters.search} },
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

  //    Buscar processo específico
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

    // Verificar permissão
    await this.checkViewPermission(process, userId);

    return process;
  }

  //    Buscar tarefas do usuário logado
  async getMyTasks(userId: string, companyId: string) {
    // Buscar setor do usuário
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

  //    Buscar processos criados pelo usuário
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

  //    Estatísticas para dashboard
  async getDashboardStats(userId: string, companyId: string) {
    const [
      totalProcesses,
      activeProcesses,
      completedProcesses,
      myTasks,
      recentProcesses,
    ] = await Promise.all([
      // Total de processos
      this.prisma.processInstance.count({
        where: { companyId },
      }),
      // Processos ativos
      this.prisma.processInstance.count({
        where: { companyId, status: 'IN_PROGRESS' },
      }),
      // Processos concluídos
      this.prisma.processInstance.count({
        where: { companyId, status: 'COMPLETED' },
      }),
      // Minhas tarefas pendentes
      this.getMyTasks(userId, companyId),
      // Processos recentes
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

async executeStep(executeDto: ExecuteStepDto, userId: string): Promise<StepExecution> {
  console.log('🔍 ProcessesService.executeStep called:', { executeDto, userId });

  const stepExecution = await this.prisma.stepExecution.findUnique({
    where: { id: executeDto.stepExecutionId },
    include: {
      step: { include: { assignedToUser: true, assignedToSector: true } },
      processInstance: {
        include: {
          processType: { include: { steps: { orderBy: { order: 'asc' } } } },
        },
      },
    },
  });

  if (!stepExecution) {
    console.log('❌ Step execution not found:', executeDto.stepExecutionId);
    throw new NotFoundException('Execução de etapa não encontrada');
  }

  console.log('✅ Step execution found:', {
    id: stepExecution.id,
    status: stepExecution.status,
    stepName: stepExecution.step.name,
    stepType: stepExecution.step.type
  });

  await this.checkExecutePermission(stepExecution, userId);
  
  if (stepExecution.status !== StepExecutionStatus.IN_PROGRESS) {
    console.log('❌ Step not in progress:', stepExecution.status);
    throw new BadRequestException('Esta etapa não está em progresso');
  }

  // ✅ VALIDAÇÃO DE AÇÃO MELHORADA
  if (executeDto.action && stepExecution.step.actions) {
    try {
      const allowedActions = Array.isArray(stepExecution.step.actions)
        ? stepExecution.step.actions
        : JSON.parse(stepExecution.step.actions as any);
      
      console.log('🔍 Checking action:', {
        providedAction: executeDto.action,
        allowedActions: allowedActions
      });
      
      if (!allowedActions.includes(executeDto.action)) {
        throw new BadRequestException(`Ação "${executeDto.action}" não permitida. Ações disponíveis: ${allowedActions.join(', ')}`);
      }
    } catch (parseError) {
      console.error('❌ Error parsing actions:', parseError);
      throw new BadRequestException('Erro ao validar ações disponíveis');
    }
  }

  // ✅ VALIDAÇÃO DE ANEXOS
  if (stepExecution.step.requireAttachment) {
    const attachmentCount = await this.prisma.attachment.count({ 
      where: { stepExecutionId: executeDto.stepExecutionId } 
    });
    const minAttachments = stepExecution.step.minAttachments || 1;
    
    console.log('🔍 Checking attachments:', {
      required: stepExecution.step.requireAttachment,
      count: attachmentCount,
      minRequired: minAttachments
    });
    
    if (attachmentCount < minAttachments) {
      throw new BadRequestException(`Esta etapa requer no mínimo ${minAttachments} anexo(s). Encontrados: ${attachmentCount}`);
    }
  }

  console.log('🚀 Starting transaction to execute step...');

  return this.prisma.$transaction(async (tx) => {
    // ✅ ATUALIZAR EXECUÇÃO DA ETAPA
    const updatedExecution = await tx.stepExecution.update({
      where: { id: executeDto.stepExecutionId },
      data: {
        status: StepExecutionStatus.COMPLETED,
        action: executeDto.action,
        comment: executeDto.comment,
        metadata: executeDto.metadata ?? undefined,
        executorId: userId,
        completedAt: new Date(),
      },
    });

    console.log('✅ Step execution updated:', {
      id: updatedExecution.id,
      status: updatedExecution.status,
      action: updatedExecution.action
    });

    const currentStep = stepExecution.step;
    const allSteps = stepExecution.processInstance.processType.steps;

    let nextStepOrder: number | null = null;
    let shouldEnd = false;

    // ✅ LÓGICA DE FLUXO MELHORADA
    if (currentStep.conditions && executeDto.action) {
      try {
        const conditions = typeof currentStep.conditions === 'string'
          ? JSON.parse(currentStep.conditions)
          : currentStep.conditions;

        console.log('🔍 Processing conditions:', {
          action: executeDto.action,
          conditions: conditions
        });

        const condition = conditions[executeDto.action];
        
        if (condition === 'END') {
          shouldEnd = true;
          console.log('🏁 Flow condition: END');
        } else if (condition === 'PREVIOUS' && currentStep.order > 1) {
          nextStepOrder = currentStep.order - 1;
          console.log('⬅️ Flow condition: PREVIOUS to step', nextStepOrder);
          
          await tx.stepExecution.updateMany({
            where: { 
              processInstanceId: stepExecution.processInstanceId, 
              step: { order: nextStepOrder } 
            },
            data: { status: StepExecutionStatus.IN_PROGRESS },
          });
        } else if (typeof condition === 'number') {
          nextStepOrder = condition;
          console.log('➡️ Flow condition: GOTO step', nextStepOrder);
        }
      } catch (conditionError) {
        console.error('❌ Error processing conditions:', conditionError);
        // Continua com fluxo padrão se houver erro nas condições
      }
    }

    // ✅ FLUXO PADRÃO SE NÃO HOUVER CONDIÇÕES ESPECIAIS
    if (!shouldEnd && nextStepOrder === null) {
      nextStepOrder = currentStep.order + 1;
      console.log('➡️ Default flow: next step', nextStepOrder);
    }

    const nextStep = nextStepOrder ? allSteps.find(s => s.order === nextStepOrder) : null;

    if (nextStep && !shouldEnd) {
      console.log('🚀 Activating next step:', {
        stepId: nextStep.id,
        stepName: nextStep.name,
        order: nextStep.order
      });

      await tx.stepExecution.updateMany({
        where: { 
          processInstanceId: stepExecution.processInstanceId, 
          stepId: nextStep.id 
        },
        data: { 
          status: StepExecutionStatus.IN_PROGRESS,
          dueAt: nextStep.slaHours ? 
            new Date(Date.now() + (nextStep.slaHours * 60 * 60 * 1000)) : 
            null
        },
      });

      await tx.processInstance.update({
        where: { id: stepExecution.processInstanceId },
        data: { currentStepOrder: nextStepOrder ?? undefined },
      });
    } else {
      console.log('🏁 Process ending:', {
        shouldEnd,
        hasNextStep: !!nextStep,
        action: executeDto.action
      });

      const finalStatus = shouldEnd || executeDto.action === 'reprovar'
        ? ProcessStatus.REJECTED
        : ProcessStatus.COMPLETED;

      await tx.processInstance.update({
        where: { id: stepExecution.processInstanceId },
        data: { 
          status: finalStatus, 
          completedAt: new Date() 
        },
      });
    }

    console.log('✅ Step execution completed successfully');
    return updatedExecution;
  });
}

// ✅ NOVO MÉTODO: Validação específica por tipo de etapa
private async validateStepTypeExecution(stepExecution: any, executeDto: ExecuteStepDto): Promise<void> {
  const stepType = stepExecution.step.type;
  
  switch (stepType) {
    case 'APPROVAL':
      if (!executeDto.action || !['aprovar', 'reprovar'].includes(executeDto.action)) {
        throw new BadRequestException('Etapa de aprovação requer ação "aprovar" ou "reprovar"');
      }
      if (executeDto.action === 'reprovar' && !executeDto.comment?.trim()) {
        throw new BadRequestException('Reprovação requer justificativa no comentário');
      }
      break;

    case 'INPUT':
      if (!executeDto.metadata || Object.keys(executeDto.metadata).length === 0) {
        throw new BadRequestException('Etapa de entrada de dados requer dados no campo metadata');
      }
      break;

    case 'UPLOAD':
      // Validação de anexos já existe no método principal
      break;

    case 'REVIEW':
      if (!executeDto.action || executeDto.action !== 'revisado') {
        throw new BadRequestException('Etapa de revisão requer ação "revisado"');
      }
      break;

    case 'SIGNATURE':
      // Lógica de assinatura já existe
      break;

    default:
      // Tipos não específicos seguem fluxo padrão
      break;
  }
}

// ✅ NOVO MÉTODO: Processamento específico por tipo de etapa
private async processStepTypeData(stepExecution: any, executeDto: ExecuteStepDto, tx: any): Promise<any> {
  const stepType = stepExecution.step.type;
  let processedMetadata = executeDto.metadata || {};

  switch (stepType) {
    case 'APPROVAL':
      processedMetadata = {
        ...processedMetadata,
        approvalResult: executeDto.action,
        approvalTimestamp: new Date().toISOString(),
        approvalComment: executeDto.comment,
      };
      break;

    case 'INPUT':
      // Validar campos obrigatórios se configurados
      const stepConfig = stepExecution.step.typeConfig || {};
      if (stepConfig.requiredFields) {
        for (const field of stepConfig.requiredFields) {
          if (!executeDto.metadata[field]) {
            throw new BadRequestException(`Campo obrigatório não preenchido: ${field}`);
          }
        }
      }
      
      // Atualizar formData do processo
      await tx.processInstance.update({
        where: { id: stepExecution.processInstanceId },
        data: {
          formData: {
            ...(stepExecution.processInstance.formData as any || {}),
            ...executeDto.metadata
          }
        }
      });
      break;

    case 'UPLOAD':
      const attachmentCount = await tx.attachment.count({
        where: { stepExecutionId: executeDto.stepExecutionId }
      });
      
      processedMetadata = {
        ...processedMetadata,
        uploadedFiles: attachmentCount,
        uploadTimestamp: new Date().toISOString(),
      };
      break;

    case 'REVIEW':
      processedMetadata = {
        ...processedMetadata,
        reviewResult: 'revisado',
        reviewTimestamp: new Date().toISOString(),
        reviewComment: executeDto.comment,
      };
      break;

    default:
      // Manter metadata original para outros tipos
      break;
  }

  return processedMetadata;
}

  async validateAndSign(stepExecutionId: string, attachmentId: string, validateDto: ValidateSignatureDto, userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const isPasswordValid = await bcrypt.compare(validateDto.password, user.password);
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
      data: { signedAt: new Date() } 
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

  private async checkViewPermission(instance: any, userId: string): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({ 
      where: { userId, companyId: instance.companyId } 
    });
    if (!userCompany) throw new ForbiddenException('Sem permissão para visualizar este processo');
  }

  private async checkExecutePermission(stepExecution: any, userId: string): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({ 
      where: { userId, companyId: stepExecution.processInstance.companyId } 
    });
    if (!userCompany) throw new ForbiddenException('Sem permissão');

    const step = stepExecution.step;
    if (step.assignedToUserId === userId) return;
    if (step.assignedToSectorId && userCompany.sectorId === step.assignedToSectorId) return;
    if (userCompany.role === 'ADMIN') return;

    throw new ForbiddenException('Sem permissão para executar esta etapa');
  }

  // ✅ MÉTODO REFATORADO: Validação de formData apenas para campos não-arquivo
  private async validateFormData(formData: Record<string, any>, formFields: any[]): Promise<void> {
    for (const field of formFields) {
      // ✅ CRÍTICO: Pular campos de arquivo na validação inicial
      if (field.type === 'FILE') {
        continue;
      }

      const value = formData[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`Campo "${field.label}" é obrigatório`);
      }
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'EMAIL':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) 
              throw new BadRequestException(`Campo "${field.label}" deve ser um email válido`);
            break;
          case 'CPF':
            if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) 
              throw new BadRequestException(`Campo "${field.label}" deve ser um CPF válido`);
            break;
          case 'CNPJ':
            if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) 
              throw new BadRequestException(`Campo "${field.label}" deve ser um CNPJ válido`);
            break;
          case 'NUMBER':
            if (isNaN(Number(value))) 
              throw new BadRequestException(`Campo "${field.label}" deve ser um número`);
            break;
          case 'DATE':
            if (isNaN(Date.parse(value))) 
              throw new BadRequestException(`Campo "${field.label}" deve ser uma data válida`);
            break;
        }
        if (field.validations) {
          const validations = typeof field.validations === 'string' 
            ? JSON.parse(field.validations) 
            : field.validations;
          
          if (validations.minLength && value.length < validations.minLength)
            throw new BadRequestException(
              validations.customMessage || `Campo "${field.label}" deve ter no mínimo ${validations.minLength} caracteres`
            );
          if (validations.maxLength && value.length > validations.maxLength)
            throw new BadRequestException(
              validations.customMessage || `Campo "${field.label}" deve ter no máximo ${validations.maxLength} caracteres`
            );
          if (validations.min && Number(value) < validations.min)
            throw new BadRequestException(
              validations.customMessage || `Campo "${field.label}" deve ser maior ou igual a ${validations.min}`
            );
          if (validations.max && Number(value) > validations.max)
            throw new BadRequestException(
              validations.customMessage || `Campo "${field.label}" deve ser menor ou igual a ${validations.max}`
            );
          if (validations.pattern && !new RegExp(validations.pattern).test(value))
            throw new BadRequestException(
              validations.customMessage || `Campo "${field.label}" não está no formato correto`
            );
        }
      }
    }
  }
}