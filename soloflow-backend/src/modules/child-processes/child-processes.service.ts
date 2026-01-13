import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateChildProcessConfigDto,
  CreateChildProcessDto,
  UpdateChildProcessConfigDto,
} from './dto';
import {
  ChildProcessConfig,
  ChildProcessInstance,
  ChildProcessMode,
  ChildProcessStatus,
  ProcessStatus,
  StepExecutionStatus,
} from '@prisma/client';

@Injectable()
export class ChildProcessesService {
  constructor(private prisma: PrismaService) {}

  // ════════════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES DE SUB-PROCESSOS
  // ════════════════════════════════════════════════════════════════════════════════

  async createConfig(
    dto: CreateChildProcessConfigDto,
    userId: string,
  ): Promise<ChildProcessConfig> {
    // Verificar se o processo pai existe e o usuário tem permissão
    const parentProcess = await this.prisma.processInstance.findUnique({
      where: { id: dto.processInstanceId },
    });

    if (!parentProcess) {
      throw new NotFoundException('Processo pai não encontrado');
    }

    await this.checkProcessPermission(parentProcess, userId);

    // Verificar se o processo pai não está cancelado
    if (parentProcess.status === ProcessStatus.CANCELLED) {
      throw new BadRequestException(
        'Não é possível criar configuração de sub-processo para um processo cancelado',
      );
    }

    // Verificar se o tipo de processo filho existe
    const childProcessType = await this.prisma.processType.findUnique({
      where: { id: dto.childProcessTypeId },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!childProcessType || childProcessType.versions.length === 0) {
      throw new NotFoundException(
        'Tipo de processo filho não encontrado ou sem versão ativa',
      );
    }

    // Se modo RECURRENT ou SCHEDULED, calcular nextRunAt
    let nextRunAt: Date | null = null;
    if (dto.mode === ChildProcessMode.RECURRENT && dto.recurrence) {
      nextRunAt = this.calculateNextRunDate(dto.recurrence);
      }

    return this.prisma.childProcessConfig.create({
      data: {
        name: dto.name,
        processInstanceId: dto.processInstanceId,
        childProcessTypeId: dto.childProcessTypeId,
        mode: dto.mode,
        triggerStepVersionId: dto.triggerStepVersionId,
        recurrence: dto.recurrence ?? undefined,
        waitForCompletion: dto.waitForCompletion ?? false,
        autoStart: dto.autoStart ?? true,
        inputDataMapping: dto.inputDataMapping ?? undefined,
        nextRunAt,
      },
      include: {
        childProcessType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        processInstance: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });
  }

  async updateConfig(
    configId: string,
    dto: UpdateChildProcessConfigDto,
    userId: string,
  ): Promise<ChildProcessConfig> {
    const config = await this.prisma.childProcessConfig.findUnique({
      where: { id: configId },
      include: { processInstance: true },
    });

    if (!config) {
      throw new NotFoundException('Configuração não encontrada');
    }

    await this.checkProcessPermission(config.processInstance, userId);

    return this.prisma.childProcessConfig.update({
      where: { id: configId },
      data: {
        name: dto.name,
        childProcessTypeId: dto.childProcessTypeId,
        triggerStepVersionId: dto.triggerStepVersionId,
        recurrence: dto.recurrence !== undefined ? dto.recurrence : undefined,
        waitForCompletion: dto.waitForCompletion,
        autoStart: dto.autoStart,
        inputDataMapping: dto.inputDataMapping !== undefined ? dto.inputDataMapping : undefined,
      },
      include: {
        childProcessType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  async deleteConfig(configId: string, userId: string): Promise<void> {
    const config = await this.prisma.childProcessConfig.findUnique({
      where: { id: configId },
      include: { processInstance: true },
    });

    if (!config) {
      throw new NotFoundException('Configuração não encontrada');
    }

    await this.checkProcessPermission(config.processInstance, userId);

    await this.prisma.childProcessConfig.delete({
      where: { id: configId },
    });
  }

  async getConfigsByProcess(
    processInstanceId: string,
    userId: string,
  ): Promise<ChildProcessConfig[]> {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: processInstanceId },
    });

    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    await this.checkProcessPermission(process, userId);

    return this.prisma.childProcessConfig.findMany({
      where: { processInstanceId },
      include: {
        childProcessType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        generatedProcesses: {
          include: {
            childProcessInstance: {
              select: {
                id: true,
                code: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // CRIAÇÃO DE SUB-PROCESSOS (MANUAL)
  // ════════════════════════════════════════════════════════════════════════════════

  async createChildProcess(
    dto: CreateChildProcessDto,
    userId: string,
  ): Promise<ChildProcessInstance> {
    // Verificar processo pai
    const parentProcess = await this.prisma.processInstance.findUnique({
      where: { id: dto.parentProcessInstanceId },
      include: {
        processTypeVersion: {
          include: {
            processType: true,
          },
        },
      },
    });

    if (!parentProcess) {
      throw new NotFoundException('Processo pai não encontrado');
    }

    await this.checkProcessPermission(parentProcess, userId);

    // Verificar se processo pai não está cancelado (regra de negócio)
    if (parentProcess.status === ProcessStatus.CANCELLED) {
      throw new BadRequestException(
        'Não é possível criar sub-processo para um processo cancelado',
      );
    }

    // Buscar tipo de processo filho e sua versão ativa
    const childProcessType = await this.prisma.processType.findUnique({
      where: { id: dto.childProcessTypeId },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            steps: { orderBy: { order: 'asc' } },
            formFields: { orderBy: { order: 'asc' } },
          },
          take: 1,
        },
      },
    });

    if (!childProcessType || childProcessType.versions.length === 0) {
      throw new NotFoundException(
        'Tipo de processo filho não encontrado ou sem versão ativa',
      );
    }

    const activeVersion = childProcessType.versions[0];

    // Preparar dados do formulário (mapeamento se houver config)
    let formData = dto.formData || {};
    if (dto.configId) {
      const config = await this.prisma.childProcessConfig.findUnique({
        where: { id: dto.configId },
      });
      if (config?.inputDataMapping) {
        formData = this.applyDataMapping(
          parentProcess.formData as Record<string, any>,
          config.inputDataMapping as Record<string, string>,
        );
      }
    }

    // Criar processo filho
    const childProcess = await this.prisma.processInstance.create({
      data: {
        processTypeVersionId: activeVersion.id,
        createdById: userId,
        companyId: parentProcess.companyId,
        title: dto.title || `Sub-processo de ${parentProcess.code}`,
        description: dto.description,
        formData: formData,
        code: await this.generateChildProcessCode(parentProcess.code),
        status: ProcessStatus.IN_PROGRESS,
      },
    });

    // Criar execuções das etapas
    const stepExecutionsData = activeVersion.steps.map((step) => {
      const now = new Date();
      const slaHours = step.slaDays ? step.slaDays * 24 : step.slaHours;
      const dueAt = slaHours
        ? new Date(now.getTime() + slaHours * 60 * 60 * 1000)
        : null;

      return {
        processInstanceId: childProcess.id,
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

    // Criar registro do relacionamento pai-filho
    const childRelation = await this.prisma.childProcessInstance.create({
      data: {
        configId: dto.configId || null,
        parentProcessInstanceId: dto.parentProcessInstanceId,
        childProcessInstanceId: childProcess.id,
        originStepExecutionId: dto.originStepExecutionId || null,
        status: ChildProcessStatus.ACTIVE,
      },
      include: {
        childProcessInstance: {
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
              include: {
                stepVersion: true,
              },
              orderBy: { stepVersion: { order: 'asc' } },
            },
          },
        },
        parentProcessInstance: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    // Atualizar contador da config se existir
    if (dto.configId) {
      await this.prisma.childProcessConfig.update({
        where: { id: dto.configId },
        data: {
          runCount: { increment: 1 },
          lastRunAt: new Date(),
        },
      });
    }

    return childRelation;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // LISTAGEM E CONSULTA
  // ════════════════════════════════════════════════════════════════════════════════

  async getChildProcesses(
    parentProcessInstanceId: string,
    userId: string,
  ): Promise<ChildProcessInstance[]> {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: parentProcessInstanceId },
    });

    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    await this.checkProcessPermission(process, userId);

    const children = await this.prisma.childProcessInstance.findMany({
      where: { parentProcessInstanceId },
      include: {
        childProcessInstance: {
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
        },
        config: {
          select: {
            id: true,
            name: true,
            mode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sincronizar status desatualizados automaticamente
    for (const child of children) {
      const childProcess = child.childProcessInstance;
      if (!childProcess) continue;

      let expectedStatus = child.status;

      // Mapear status do processo para status esperado da relação
      if (childProcess.status === 'COMPLETED' && child.status !== ChildProcessStatus.COMPLETED) {
        expectedStatus = ChildProcessStatus.COMPLETED;
      } else if (childProcess.status === 'CANCELLED' && child.status !== ChildProcessStatus.CANCELLED) {
        expectedStatus = ChildProcessStatus.CANCELLED;
      } else if (childProcess.status === 'REJECTED' && child.status !== ChildProcessStatus.FAILED) {
        expectedStatus = ChildProcessStatus.FAILED;
      } else if (childProcess.status === 'IN_PROGRESS' && child.status === ChildProcessStatus.PENDING) {
        expectedStatus = ChildProcessStatus.ACTIVE;
      }

      if (expectedStatus !== child.status) {
        await this.prisma.childProcessInstance.update({
          where: { id: child.id },
          data: {
            status: expectedStatus,
            completedAt: ['COMPLETED', 'CANCELLED', 'FAILED'].includes(expectedStatus)
              ? childProcess.completedAt || new Date()
              : undefined,
          },
        });

        // Atualizar o objeto em memória para retornar o valor correto
        child.status = expectedStatus;
      }
    }

    return children;
  }

  async getParentProcess(
    childProcessInstanceId: string,
    userId: string,
  ): Promise<ChildProcessInstance | null> {
    const process = await this.prisma.processInstance.findUnique({
      where: { id: childProcessInstanceId },
    });

    if (!process) {
      throw new NotFoundException('Processo não encontrado');
    }

    await this.checkProcessPermission(process, userId);

    return this.prisma.childProcessInstance.findUnique({
      where: { childProcessInstanceId },
      include: {
        parentProcessInstance: {
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
              },
            },
          },
        },
        config: {
          select: {
            id: true,
            name: true,
            mode: true,
          },
        },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // ATUALIZAÇÃO DE STATUS (quando processo filho completa)
  // ════════════════════════════════════════════════════════════════════════════════

  async syncChildProcessStatus(childProcessInstanceId: string): Promise<void> {
    const childRelation = await this.prisma.childProcessInstance.findUnique({
      where: { childProcessInstanceId },
      include: {
        childProcessInstance: true,
        config: true,
      },
    });

    if (!childRelation) return;

    const childProcess = childRelation.childProcessInstance;
    let newStatus: ChildProcessStatus = childRelation.status;

    // Atualizar status baseado no status do processo filho
    switch (childProcess.status) {
      case ProcessStatus.COMPLETED:
        newStatus = ChildProcessStatus.COMPLETED;
        break;
      case ProcessStatus.CANCELLED:
        newStatus = ChildProcessStatus.CANCELLED;
        break;
      case ProcessStatus.REJECTED:
        newStatus = ChildProcessStatus.FAILED;
        break;
    }

    if (newStatus !== childRelation.status) {
      const isTerminalStatus = newStatus === ChildProcessStatus.COMPLETED ||
        newStatus === ChildProcessStatus.CANCELLED ||
        newStatus === ChildProcessStatus.FAILED;

      await this.prisma.childProcessInstance.update({
        where: { id: childRelation.id },
        data: {
          status: newStatus,
          completedAt: isTerminalStatus ? new Date() : undefined,
        },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // MÉTODOS AUXILIARES
  // ════════════════════════════════════════════════════════════════════════════════

  private async checkProcessPermission(
    process: any,
    userId: string,
  ): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: process.companyId },
    });

    if (!userCompany) {
      throw new ForbiddenException('Sem permissão para acessar este processo');
    }
  }

  private async generateChildProcessCode(parentCode: string): Promise<string> {
    // Contar quantos sub-processos já existem para este pai
    const count = await this.prisma.childProcessInstance.count({
      where: {
        parentProcessInstance: {
          code: parentCode,
        },
      },
    });

    // Formato: PROC-2025-0001-SUB-01
    return `${parentCode}-SUB-${(count + 1).toString().padStart(2, '0')}`;
  }

  private applyDataMapping(
    sourceData: Record<string, any>,
    mapping: Record<string, string>,
    targetData: Record<string, any> = {},
  ): Record<string, any> {
    const result = { ...targetData };

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (sourceData && sourceData[sourceField] !== undefined) {
        result[targetField] = sourceData[sourceField];
      }
    }

    return result;
  }

  private calculateNextRunDate(recurrence: any): Date {
    const now = new Date();
    const baseDate = recurrence.startDate ? new Date(recurrence.startDate) : now;

    switch (recurrence.frequency) {
      case 'DAILY':
        return new Date(baseDate.setDate(baseDate.getDate() + (recurrence.interval || 1)));
      case 'WEEKLY':
        return new Date(baseDate.setDate(baseDate.getDate() + 7 * (recurrence.interval || 1)));
      case 'MONTHLY':
        const nextMonth = new Date(baseDate);
        nextMonth.setMonth(nextMonth.getMonth() + (recurrence.interval || 1));
        if (recurrence.dayOfMonth) {
          nextMonth.setDate(recurrence.dayOfMonth);
        }
        return nextMonth;
      default:
        return now;
    }
  }

}