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
    

    const { steps = [], formFields = [], ...processTypeData } = createProcessTypeDto;

    // Verificar se a empresa existe e está ativa
    const company = await this.prisma.company.findUnique({
      where: { id: processTypeData.companyId },
    });

    if (!company || !company.isActive) {
      throw new BadRequestException('Empresa não encontrada ou inativa');
    }

    // Verificar se já existe tipo de processo com mesmo nome na empresa
    const existing = await this.prisma.processType.findFirst({
      where: {
        name: processTypeData.name,
        companyId: processTypeData.companyId,
      },
    });

    if (existing) {
      throw new ConflictException('Tipo de processo com este nome já existe nesta empresa');
    }

    // Validar etapas se fornecidas
    if (steps && steps.length > 0) {
      await this.validateSteps(steps, processTypeData.companyId);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // ✅ CORRIGIDO: Criar o tipo de processo com valores corretos para campos JSON
        const processType = await tx.processType.create({
          data: {
            ...processTypeData,
            description: processTypeData.description || undefined, // ✅ null -> undefined
          },
        });

        console.log('ProcessType created:', processType);

        // ✅ CORRIGIDO: Criar etapas com tratamento correto de campos JSON
        if (steps && steps.length > 0) {
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            await tx.step.create({
              data: {
                ...step,
                processTypeId: processType.id,
                instructions: step.instructions?.trim() || undefined,
                slaHours: step.slaHours || undefined,
                order: step.order || (i + 1),
                actions: step.actions ? JSON.stringify(step.actions) : '[]', // ✅ JSON como string
                conditions: step.conditions ? JSON.stringify(step.conditions) : undefined, // ✅ Correto
                allowedFileTypes: step.allowedFileTypes ? JSON.stringify(step.allowedFileTypes) : undefined, // ✅ Correto
              },
            });
          }
        }

        // ✅ CORRIGIDO: Criar campos do formulário com tratamento correto de campos JSON
        if (formFields && formFields.length > 0) {
          for (let i = 0; i < formFields.length; i++) {
            const field = formFields[i];
            await tx.formField.create({
              data: {
                ...field,
                processTypeId: processType.id,
                order: field.order || (i + 1),
                options: field.options ? JSON.stringify(field.options) : undefined, // ✅ JSON como string
                validations: field.validations ? JSON.stringify(field.validations) : undefined, // ✅ JSON como string
                placeholder: field.placeholder || undefined, // ✅ null -> undefined
                defaultValue: field.defaultValue || undefined, // ✅ null -> undefined
                helpText: field.helpText || undefined, // ✅ null -> undefined
              },
            });
          }
        }

        // ✅ CORRIGIDO: Buscar o tipo de processo completo COM as relações incluídas
        const fullProcessType = await tx.processType.findUnique({
          where: { id: processType.id },
          include: {
            steps: { 
              orderBy: { order: 'asc' },
              include: {
                assignedToUser: { select: { id: true, name: true, email: true } },
                assignedToSector: { select: { id: true, name: true } },
              },
            },
            formFields: { orderBy: { order: 'asc' } },
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!fullProcessType) {
          throw new NotFoundException('Erro ao recuperar tipo de processo recém-criado');
        }

        return fullProcessType;
      });
    } catch (error) {
      console.error('Error creating process type:', error);
      throw new BadRequestException('Erro ao criar tipo de processo: ' + error.message);
    }
  }

  // ✅ CORRIGIDO: Garantir que todas as consultas incluam as relações necessárias
  async findAll(companyId: string): Promise<ProcessType[]> {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }

    console.log('Finding process types for company:', companyId);

    return this.prisma.processType.findMany({
      where: { 
        companyId, 
        isActive: true 
      },
      include: {
        steps: { 
          orderBy: { order: 'asc' },
          include: {
            assignedToUser: { select: { id: true, name: true, email: true } },
            assignedToSector: { select: { id: true, name: true } },
          },
        },
        formFields: { orderBy: { order: 'asc' } },
        _count: { select: { instances: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ✅ CORRIGIDO: Incluir relações na busca individual
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

    if (!processType) {
      throw new NotFoundException('Tipo de processo não encontrado');
    }

    return processType;
  }

  // ✅ CORRIGIDO: Update com tratamento correto de campos JSON
  async update(id: string, dto: UpdateProcessTypeDto): Promise<ProcessType> {
    const processType = await this.findOne(id);

    // Remover campos que não devem ser atualizados diretamente
    const { companyId, formFields, ...safeDto } = dto;

    try {
      return await this.prisma.processType.update({
        where: { id },
        data: {
          ...safeDto,
          description: safeDto.description || undefined, // ✅ null -> undefined
        },
        include: {
          steps: { 
            orderBy: { order: 'asc' },
            include: {
              assignedToUser: { select: { id: true, name: true, email: true } },
              assignedToSector: { select: { id: true, name: true } },
            },
          },
          formFields: { orderBy: { order: 'asc' } },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Error updating process type:', error);
      throw new BadRequestException('Erro ao atualizar tipo de processo: ' + error.message);
    }
  }

  // ✅ CORRIGIDO: Adicionar campo de formulário com JSON correto
  async addFormField(processTypeId: string, dto: CreateFormFieldDto): Promise<FormField> {
    const processType = await this.findOne(processTypeId);

    // Reordenar campos existentes se necessário
    await this.prisma.formField.updateMany({
      where: { processTypeId, order: { gte: dto.order } },
      data: { order: { increment: 1 } },
    });

    try {
      return await this.prisma.formField.create({
        data: {
          ...dto,
          processTypeId,
          options: dto.options ? JSON.stringify(dto.options) : undefined, // ✅ JSON como string
          validations: dto.validations ? JSON.stringify(dto.validations) : undefined, // ✅ JSON como string
          placeholder: dto.placeholder || undefined, // ✅ null -> undefined
          defaultValue: dto.defaultValue || undefined, // ✅ null -> undefined
          helpText: dto.helpText || undefined, // ✅ null -> undefined
        },
      });
    } catch (error) {
      console.error('Error adding form field:', error);
      throw new BadRequestException('Erro ao adicionar campo: ' + error.message);
    }
  }

  // ✅ CORRIGIDO: Atualizar campo de formulário com JSON correto
  async updateFormField(fieldId: string, dto: UpdateFormFieldDto): Promise<FormField> {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    try {
      return await this.prisma.formField.update({
        where: { id: fieldId },
        data: {
          ...dto,
          options: dto.options ? JSON.stringify(dto.options) : undefined, // ✅ JSON como string
          validations: dto.validations ? JSON.stringify(dto.validations) : undefined, // ✅ JSON como string
          placeholder: dto.placeholder || undefined, // ✅ null -> undefined
          defaultValue: dto.defaultValue || undefined, // ✅ null -> undefined
          helpText: dto.helpText || undefined, // ✅ null -> undefined
        },
      });
    } catch (error) {
      console.error('Error updating form field:', error);
      throw new BadRequestException('Erro ao atualizar campo: ' + error.message);
    }
  }

  // ✅ CORRIGIDO: Adicionar etapa com JSON correto
  async addStep(processTypeId: string, dto: CreateStepDto): Promise<Step> {
    const processType = await this.findOne(processTypeId);
    await this.validateSteps([dto], processType.companyId);

    // Reordenar etapas existentes se necessário
    await this.prisma.step.updateMany({
      where: { processTypeId, order: { gte: dto.order } },
      data: { order: { increment: 1 } },
    });

    try {
      return await this.prisma.step.create({
        data: {
          ...dto,
          processTypeId,
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          actions: dto.actions ? JSON.stringify(dto.actions) : '[]', // ✅ JSON como string
          conditions: dto.conditions ? JSON.stringify(dto.conditions) : undefined, // ✅ JSON como string
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined, // ✅ JSON como string
          description: dto.description || undefined, // ✅ null -> undefined
        },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          assignedToSector: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      console.error('Error adding step:', error);
      throw new BadRequestException('Erro ao adicionar etapa: ' + error.message);
    }
  }

  // ✅ CORRIGIDO: Atualizar etapa com JSON correto
  async updateStep(stepId: string, dto: Partial<CreateStepDto>): Promise<Step> {
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { processType: true },
    });

    if (!step) {
      throw new NotFoundException('Etapa não encontrada');
    }

    // Validar responsáveis se estiverem sendo atualizados
    if (dto.assignedToUserId || dto.assignedToSectorId) {
      await this.validateSteps([dto as CreateStepDto], step.processType.companyId);
    }

    try {
      return await this.prisma.step.update({
        where: { id: stepId },
        data: {
          ...dto,
          actions: dto.actions ? JSON.stringify(dto.actions) : undefined, // ✅ JSON como string
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          conditions: dto.conditions ? JSON.stringify(dto.conditions) : undefined, // ✅ JSON como string
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined, // ✅ JSON como string
          description: dto.description || undefined, // ✅ null -> undefined
        },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          assignedToSector: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      console.error('Error updating step:', error);
      throw new BadRequestException('Erro ao atualizar etapa: ' + error.message);
    }
  }

  async removeFormField(fieldId: string): Promise<void> {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    try {
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
    } catch (error) {
      console.error('Error removing form field:', error);
      throw new BadRequestException('Erro ao remover campo: ' + error.message);
    }
  }

  async removeStep(stepId: string): Promise<void> {
    const step = await this.prisma.step.findUnique({ where: { id: stepId } });
    if (!step) {
      throw new NotFoundException('Etapa não encontrada');
    }

    // Verificar se a etapa tem execuções
    const executions = await this.prisma.stepExecution.count({ where: { stepId } });
    if (executions > 0) {
      throw new BadRequestException('Não é possível remover etapa com execuções');
    }

    try {
      await this.prisma.$transaction([
        this.prisma.step.delete({ where: { id: stepId } }),
        this.prisma.step.updateMany({
          where: { 
            processTypeId: step.processTypeId, 
            order: { gt: step.order } 
          },
          data: { order: { decrement: 1 } },
        }),
      ]);
    } catch (error) {
      console.error('Error removing step:', error);
      throw new BadRequestException('Erro ao remover etapa: ' + error.message);
    }
  }

  private async validateSteps(steps: CreateStepDto[], companyId: string): Promise<void> {
    console.log('Validating steps for company:', companyId);

    for (const step of steps) {
      // Verificar se tem pelo menos um responsável
      if (!step.assignedToUserId && !step.assignedToSectorId) {
        throw new BadRequestException(`Etapa "${step.name}" deve ter um responsável (usuário ou setor)`);
      }

      // Não pode ter usuário E setor ao mesmo tempo
      if (step.assignedToUserId && step.assignedToSectorId) {
        throw new BadRequestException(`Etapa "${step.name}" não pode ter usuário E setor responsável simultaneamente`);
      }

      // Validar usuário responsável
      if (step.assignedToUserId) {
        const userCompany = await this.prisma.userCompany.findFirst({
          where: { 
            userId: step.assignedToUserId, 
            companyId,
            user: { isActive: true }
          },
        });
        if (!userCompany) {
          throw new BadRequestException(`Usuário responsável da etapa "${step.name}" não está vinculado à empresa ou está inativo`);
        }
      }

      // Validar setor responsável
      if (step.assignedToSectorId) {
        const sector = await this.prisma.sector.findFirst({
          where: { 
            id: step.assignedToSectorId,
            companyId,
            isActive: true
          }
        });
        if (!sector) {
          throw new BadRequestException(`Setor responsável da etapa "${step.name}" não existe na empresa ou está inativo`);
        }
      }

      // Validar configurações de anexo
      if (step.minAttachments && step.maxAttachments && step.minAttachments > step.maxAttachments) {
        throw new BadRequestException(`Configuração de anexos inválida na etapa "${step.name}": mínimo não pode ser maior que máximo`);
      }

      // Se requer anexo, deve permitir anexo
      if (step.requireAttachment && !step.allowAttachment) {
        throw new BadRequestException(`Configuração inválida na etapa "${step.name}": não é possível exigir anexo sem permitir anexos`);
      }
    }

    console.log('Steps validation passed');
  }
}