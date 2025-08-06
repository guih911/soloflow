import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessTypeDto } from './dto/create-process-type.dto';
import { UpdateProcessTypeDto } from './dto/update-process-type.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { ProcessType, Step, FormField } from '@prisma/client';

@Injectable()
export class ProcessTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createProcessTypeDto: CreateProcessTypeDto): Promise<ProcessType> {
    const { steps, formFields, ...processTypeData } = createProcessTypeDto;

    const existing = await this.prisma.processType.findFirst({
      where: {
        name: processTypeData.name,
        companyId: processTypeData.companyId,
      },
    });

    if (existing) {
      throw new ConflictException('Tipo de processo com este nome já existe');
    }

    await this.validateSteps(steps, processTypeData.companyId);

    return this.prisma.processType.create({
      data: {
        ...processTypeData,
        steps: {
          create: steps.map((step) => ({
            ...step,
            actions: step.actions ? step.actions : [],
            conditions: step.conditions ?? undefined,
            allowedFileTypes: step.allowedFileTypes ?? undefined,
          })),
        },
        formFields: formFields
          ? {
              create: formFields.map((field) => ({
                ...field,
                options: field.options ?? undefined,
                validations: field.validations ?? undefined,
              })),
            }
          : undefined,
      },
      include: {
        steps: { orderBy: { order: 'asc' } },
        formFields: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findAll(companyId: string): Promise<ProcessType[]> {
    return this.prisma.processType.findMany({
      where: { companyId, isActive: true },
      include: {
        steps: { orderBy: { order: 'asc' } },
        formFields: { orderBy: { order: 'asc' } },
        _count: { select: { instances: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<ProcessType> {
    const processType = await this.prisma.processType.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            assignedToUser: { select: { id: true, name: true, email: true } },
            assignedToSector: { select: { id: true, name: true } },
          },
        },
        formFields: { orderBy: { order: 'asc' } },
        company: true,
      },
    });

    if (!processType) throw new NotFoundException('Tipo de processo não encontrado');
    return processType;
  }

 async update(
  id: string,
  dto: UpdateProcessTypeDto,
): Promise<ProcessType> {
  await this.findOne(id);

  const { companyId, formFields, ...safeDto } = dto;

  return this.prisma.processType.update({
    where: { id },
    data: {
      ...safeDto,
      ...(formFields && {
        formFields: {
          create: formFields.map((field) => ({
            ...field,
            options: field.options
              ? JSON.parse(JSON.stringify(field.options))
              : undefined,
            validations: field.validations
              ? JSON.parse(JSON.stringify(field.validations))
              : undefined,
          })),
        },
      }),
    },
    include: {
      steps: { orderBy: { order: 'asc' } },
      formFields: { orderBy: { order: 'asc' } },
    },
  });
}


  async addFormField(processTypeId: string, dto: CreateFormFieldDto): Promise<FormField> {
    await this.prisma.formField.updateMany({
      where: { processTypeId, order: { gte: dto.order } },
      data: { order: { increment: 1 } },
    });

    return this.prisma.formField.create({
      data: {
        ...dto,
        processTypeId,
        options: dto.options ?? undefined,
        validations: dto.validations ?? undefined,
      },
    });
  }

  async updateFormField(fieldId: string, dto: UpdateFormFieldDto): Promise<FormField> {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Campo não encontrado');

    return this.prisma.formField.update({
      where: { id: fieldId },
      data: {
        ...dto,
        options: dto.options ?? undefined,
        validations: dto.validations ?? undefined,
      },
    });
  }

  async removeFormField(fieldId: string): Promise<void> {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Campo não encontrado');

    await this.prisma.$transaction([
      this.prisma.formField.delete({ where: { id: fieldId } }),
      this.prisma.formField.updateMany({
        where: {
          processTypeId: field.processTypeId,
          order: { gt: field.order },
        },
        data: { order: { decrement: 1 } },
      }),
    ]);
  }

  async addStep(processTypeId: string, dto: CreateStepDto): Promise<Step> {
    const processType = await this.findOne(processTypeId);
    await this.validateSteps([dto], processType.companyId);

    await this.prisma.step.updateMany({
      where: { processTypeId, order: { gte: dto.order } },
      data: { order: { increment: 1 } },
    });

    return this.prisma.step.create({
      data: {
        ...dto,
        processTypeId,
        actions: dto.actions ?? [],
        conditions: dto.conditions ?? undefined,
        allowedFileTypes: dto.allowedFileTypes ?? undefined,
      },
    });
  }

  async updateStep(stepId: string, dto: Partial<CreateStepDto>): Promise<Step> {
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { processType: true },
    });
    if (!step) throw new NotFoundException('Etapa não encontrada');

    if (dto.assignedToUserId || dto.assignedToSectorId) {
      await this.validateSteps([dto as CreateStepDto], step.processType.companyId);
    }

    return this.prisma.step.update({
      where: { id: stepId },
      data: {
        ...dto,
        actions: dto.actions ?? undefined,
        conditions: dto.conditions ?? undefined,
        allowedFileTypes: dto.allowedFileTypes ?? undefined,
      },
    });
  }

  async removeStep(stepId: string): Promise<void> {
    const step = await this.prisma.step.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Etapa não encontrada');

    const executions = await this.prisma.stepExecution.count({ where: { stepId } });
    if (executions > 0) throw new BadRequestException('Não é possível remover etapa com execuções');

    await this.prisma.$transaction([
      this.prisma.step.delete({ where: { id: stepId } }),
      this.prisma.step.updateMany({
        where: { processTypeId: step.processTypeId, order: { gt: step.order } },
        data: { order: { decrement: 1 } },
      }),
    ]);
  }

  private async validateSteps(steps: CreateStepDto[], companyId: string): Promise<void> {
    for (const step of steps) {
      if (!step.assignedToUserId && !step.assignedToSectorId) {
        throw new BadRequestException(`Etapa "${step.name}" deve ter um responsável`);
      }

      if (step.assignedToUserId && step.assignedToSectorId) {
        throw new BadRequestException(`Etapa "${step.name}" não pode ter usuário E setor`);
      }

      if (step.assignedToUserId) {
        const userCompany = await this.prisma.userCompany.findFirst({
          where: { userId: step.assignedToUserId, companyId },
        });
        if (!userCompany) {
          throw new BadRequestException(`Usuário inválido na etapa "${step.name}"`);
        }
      }

      if (step.assignedToSectorId) {
        const sector = await this.prisma.sector.findUnique({ where: { id: step.assignedToSectorId } });
        if (!sector || sector.companyId !== companyId) {
          throw new BadRequestException(`Setor inválido na etapa "${step.name}"`);
        }
      }

      if (step.minAttachments && step.maxAttachments && step.minAttachments > step.maxAttachments) {
        throw new BadRequestException(`Configuração de anexos inválida na etapa "${step.name}"`);
      }
    }
  }
}
