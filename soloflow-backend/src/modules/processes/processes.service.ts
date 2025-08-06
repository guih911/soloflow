import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ExecuteStepDto } from './dto/execute-step.dto';
import { ValidateSignatureDto } from './dto/validate-signature.dto';
import { ProcessInstance, StepExecution, ProcessStatus, StepExecutionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ProcessesService {
  constructor(private prisma: PrismaService) {}

  async createInstance(createDto: CreateProcessInstanceDto, userId: string): Promise<ProcessInstance> {
    const processType = await this.prisma.processType.findUnique({
      where: { id: createDto.processTypeId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        formFields: { orderBy: { order: 'asc' } },
      },
    });

    if (!processType) throw new NotFoundException('Tipo de processo não encontrado');

    const createdInstance = await this.prisma.processInstance.create({
      data: {
        processTypeId: createDto.processTypeId,
        createdById: userId,
        companyId: processType.companyId,
        title: createDto.title,
        description: createDto.description,
        formData: createDto.formData ?? undefined,
        metadata: createDto['metadata'] ?? undefined,
        code: await this.generateProcessCode(),
      },
    });

    await this.prisma.stepExecution.createMany({
      data: processType.steps.map((step) => ({
        processInstanceId: createdInstance.id,
        stepId: step.id,
        status: step.order === 1 ? 'IN_PROGRESS' : 'PENDING',
      })),
    });

    return createdInstance;
  }

  async executeStep(executeDto: ExecuteStepDto, userId: string): Promise<StepExecution> {
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

    if (!stepExecution) throw new NotFoundException('Execução de etapa não encontrada');
    await this.checkExecutePermission(stepExecution, userId);
    if (stepExecution.status !== StepExecutionStatus.IN_PROGRESS)
      throw new BadRequestException('Esta etapa não está em progresso');

    if (executeDto.action && stepExecution.step.actions) {
      const allowedActions = Array.isArray(stepExecution.step.actions)
        ? stepExecution.step.actions
        : JSON.parse(stepExecution.step.actions as any);
      if (!allowedActions.includes(executeDto.action))
        throw new BadRequestException('Ação não permitida para esta etapa');
    }

    if (stepExecution.step.requireAttachment) {
      const attachmentCount = await this.prisma.attachment.count({ where: { stepExecutionId: executeDto.stepExecutionId } });
      const minAttachments = stepExecution.step.minAttachments || 1;
      if (attachmentCount < minAttachments)
        throw new BadRequestException(`Esta etapa requer no mínimo ${minAttachments} anexo(s)`);
    }

    return this.prisma.$transaction(async (tx) => {
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

      const currentStep = stepExecution.step;
      const allSteps = stepExecution.processInstance.processType.steps;

      let nextStepOrder: number | null = null;
      let shouldEnd = false;

      if (currentStep.conditions && executeDto.action) {
        const conditions = typeof currentStep.conditions === 'string'
          ? JSON.parse(currentStep.conditions)
          : currentStep.conditions;

        const condition = conditions[executeDto.action];
        if (condition === 'END') {
          shouldEnd = true;
        } else if (condition === 'PREVIOUS' && currentStep.order > 1) {
          nextStepOrder = currentStep.order - 1;
          await tx.stepExecution.updateMany({
            where: { processInstanceId: stepExecution.processInstanceId, step: { order: nextStepOrder } },
            data: { status: StepExecutionStatus.IN_PROGRESS },
          });
        } else if (typeof condition === 'number') {
          nextStepOrder = condition;
        }
      }

      if (!shouldEnd && nextStepOrder === null) nextStepOrder = currentStep.order + 1;
      const nextStep = nextStepOrder ? allSteps.find(s => s.order === nextStepOrder) : null;

      if (nextStep) {
        await tx.stepExecution.updateMany({
          where: { processInstanceId: stepExecution.processInstanceId, stepId: nextStep.id },
          data: { status: StepExecutionStatus.IN_PROGRESS },
        });
        await tx.processInstance.update({
          where: { id: stepExecution.processInstanceId },
          data: { currentStepOrder: nextStepOrder ?? undefined },
        });
      } else {
        const finalStatus = shouldEnd || executeDto.action === 'rejeitar'
          ? ProcessStatus.REJECTED
          : ProcessStatus.COMPLETED;
        await tx.processInstance.update({
          where: { id: stepExecution.processInstanceId },
          data: { status: finalStatus, completedAt: new Date() },
        });
      }

      return updatedExecution;
    });
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

    await this.prisma.stepExecution.update({ where: { id: stepExecutionId }, data: { signedAt: new Date() } });
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
    const userCompany = await this.prisma.userCompany.findFirst({ where: { userId, companyId: instance.processType.companyId } });
    if (!userCompany) throw new ForbiddenException('Sem permissão para visualizar este processo');
  }

  private async checkExecutePermission(stepExecution: any, userId: string): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({ where: { userId, companyId: stepExecution.processInstance.companyId } });
    if (!userCompany) throw new ForbiddenException('Sem permissão');

    const step = stepExecution.step;
    if (step.assignedToUserId === userId) return;
    if (step.assignedToSectorId && userCompany.sectorId === step.assignedToSectorId) return;
    if (userCompany.role === 'ADMIN') return;

    throw new ForbiddenException('Sem permissão para executar esta etapa');
  }

  private async validateFormData(formData: Record<string, any>, formFields: any[]): Promise<void> {
    for (const field of formFields) {
      const value = formData[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`Campo "${field.label}" é obrigatório`);
      }
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'EMAIL':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new BadRequestException(`Campo "${field.label}" deve ser um email válido`);
            break;
          case 'CPF':
            if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) throw new BadRequestException(`Campo "${field.label}" deve ser um CPF válido`);
            break;
          case 'CNPJ':
            if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value)) throw new BadRequestException(`Campo "${field.label}" deve ser um CNPJ válido`);
            break;
          case 'NUMBER':
            if (isNaN(Number(value))) throw new BadRequestException(`Campo "${field.label}" deve ser um número`);
            break;
          case 'DATE':
            if (isNaN(Date.parse(value))) throw new BadRequestException(`Campo "${field.label}" deve ser uma data válida`);
            break;
        }
        if (field.validations) {
          const validations = typeof field.validations === 'string' ? JSON.parse(field.validations) : field.validations;
          if (validations.minLength && value.length < validations.minLength)
            throw new BadRequestException(validations.customMessage || `Campo "${field.label}" deve ter no mínimo ${validations.minLength} caracteres`);
          if (validations.maxLength && value.length > validations.maxLength)
            throw new BadRequestException(validations.customMessage || `Campo "${field.label}" deve ter no máximo ${validations.maxLength} caracteres`);
          if (validations.min && Number(value) < validations.min)
            throw new BadRequestException(validations.customMessage || `Campo "${field.label}" deve ser maior ou igual a ${validations.min}`);
          if (validations.max && Number(value) > validations.max)
            throw new BadRequestException(validations.customMessage || `Campo "${field.label}" deve ser menor ou igual a ${validations.max}`);
          if (validations.pattern && !new RegExp(validations.pattern).test(value))
            throw new BadRequestException(validations.customMessage || `Campo "${field.label}" não está no formato correto`);
        }
      }
    }
  }
}
