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
    console.log('Creating process type with data:', createProcessTypeDto);

    const { steps, formFields, ...processTypeData } = createProcessTypeDto;

    const company = await this.prisma.company.findUnique({
      where: { id: processTypeData.companyId },
    });

    if (!company || !company.isActive) {
      throw new BadRequestException('Empresa não encontrada ou inativa');
    }

    const existing = await this.prisma.processType.findFirst({
      where: {
        name: processTypeData.name,
        companyId: processTypeData.companyId,
      },
    });

    if (existing) {
      throw new ConflictException('Tipo de processo com este nome já existe nesta empresa');
    }

    if (steps && steps.length > 0) {
      await this.validateSteps(steps, processTypeData.companyId);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const processType = await tx.processType.create({
          data: {
            ...processTypeData,
            description: processTypeData.description || undefined,
          },
        });

        console.log('ProcessType created:', processType);

        if (steps && steps.length > 0) {
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            let processedConditions = step.conditions;
            if (step.type === 'INPUT' && step.conditions && typeof step.conditions === 'object') {
              processedConditions = JSON.stringify(step.conditions);
            } else if (step.conditions && typeof step.conditions === 'object') {
              processedConditions = JSON.stringify(step.conditions);
            }

            await tx.step.create({
              data: {
                ...step,
                processTypeId: processType.id,
                instructions: step.instructions?.trim() || undefined,
                slaHours: step.slaHours || undefined,
                order: step.order || (i + 1),
                actions: step.actions ? JSON.stringify(step.actions) : '[]',
                conditions: processedConditions || undefined,
                allowedFileTypes: step.allowedFileTypes ? JSON.stringify(step.allowedFileTypes) : undefined,
              },
            });
          }
        }

        if (formFields && formFields.length > 0) {
          for (let i = 0; i < formFields.length; i++) {
            const field = formFields[i];
            await tx.formField.create({
              data: {
                ...field,
                processTypeId: processType.id,
                order: field.order || (i + 1),
                options: field.options ? JSON.stringify(field.options) : undefined,
                validations: field.validations ? JSON.stringify(field.validations) : undefined,
                placeholder: field.placeholder || undefined,
                defaultValue: field.defaultValue || undefined,
                helpText: field.helpText || undefined,
              },
            });
          }
        }

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

        return this.parseProcessTypeFields(fullProcessType);
      });
    } catch (error) {
      console.error('Error creating process type:', error);
      throw new BadRequestException('Erro ao criar tipo de processo: ' + error.message);
    }
  }

  async findAll(companyId: string): Promise<ProcessType[]> {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }

    console.log('Finding process types for company:', companyId);

    const processTypes = await this.prisma.processType.findMany({
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

    return processTypes.map(pt => this.parseProcessTypeFields(pt));
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

    if (!processType) {
      throw new NotFoundException('Tipo de processo não encontrado');
    }

    return this.parseProcessTypeFields(processType);
  }

  async update(id: string, dto: UpdateProcessTypeDto): Promise<ProcessType> {
    const processType = await this.findOne(id);

    const { companyId, formFields, ...safeDto } = dto;

    try {
      const updated = await this.prisma.processType.update({
        where: { id },
        data: {
          ...safeDto,
          description: safeDto.description || undefined,
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

      return this.parseProcessTypeFields(updated);
    } catch (error) {
      console.error('Error updating process type:', error);
      throw new BadRequestException('Erro ao atualizar tipo de processo: ' + error.message);
    }
  }

  async addFormField(processTypeId: string, dto: CreateFormFieldDto): Promise<FormField> {
    const processType = await this.findOne(processTypeId);

    await this.prisma.formField.updateMany({
      where: { processTypeId, order: { gte: dto.order } },
      data: { order: { increment: 1 } },
    });

    try {
      const created = await this.prisma.formField.create({
        data: {
          ...dto,
          processTypeId,
          options: dto.options ? JSON.stringify(dto.options) : undefined,
          validations: dto.validations ? JSON.stringify(dto.validations) : undefined,
          placeholder: dto.placeholder || undefined,
          defaultValue: dto.defaultValue || undefined,
          helpText: dto.helpText || undefined,
        },
      });

      return this.parseFormFieldData(created);
    } catch (error) {
      console.error('Error adding form field:', error);
      throw new BadRequestException('Erro ao adicionar campo: ' + error.message);
    }
  }

  async updateFormField(fieldId: string, dto: UpdateFormFieldDto): Promise<FormField> {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    try {
      const updated = await this.prisma.formField.update({
        where: { id: fieldId },
        data: {
          ...dto,
          options: dto.options ? JSON.stringify(dto.options) : undefined,
          validations: dto.validations ? JSON.stringify(dto.validations) : undefined,
          placeholder: dto.placeholder || undefined,
          defaultValue: dto.defaultValue || undefined,
          helpText: dto.helpText || undefined,
        },
      });

      return this.parseFormFieldData(updated);
    } catch (error) {
      console.error('Error updating form field:', error);
      throw new BadRequestException('Erro ao atualizar campo: ' + error.message);
    }
  }

  async addStep(processTypeId: string, dto: CreateStepDto): Promise<Step> {
    const processType = await this.findOne(processTypeId);
    await this.validateSteps([dto], processType.companyId);

    await this.prisma.step.updateMany({
      where: { processTypeId, order: { gte: dto.order } },
      data: { order: { increment: 1 } },
    });

    try {
      let processedConditions = dto.conditions;
      if (dto.type === 'INPUT' && dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = JSON.stringify(dto.conditions);
      } else if (dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = JSON.stringify(dto.conditions);
      }

      const created = await this.prisma.step.create({
        data: {
          ...dto,
          processTypeId,
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          actions: dto.actions ? JSON.stringify(dto.actions) : '[]',
          conditions: processedConditions || undefined,
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined,
          description: dto.description || undefined,
        },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          assignedToSector: { select: { id: true, name: true } },
        },
      });

      return this.parseStepData(created);
    } catch (error) {
      console.error('Error adding step:', error);
      throw new BadRequestException('Erro ao adicionar etapa: ' + error.message);
    }
  }

  async updateStep(stepId: string, dto: Partial<CreateStepDto>): Promise<Step> {
    const step = await this.prisma.step.findUnique({
      where: { id: stepId },
      include: { processType: true },
    });

    if (!step) {
      throw new NotFoundException('Etapa não encontrada');
    }

    if (dto.assignedToUserId || dto.assignedToSectorId) {
      await this.validateSteps([dto as CreateStepDto], step.processType.companyId);
    }

    try {
      let processedConditions = dto.conditions;
      if (dto.type === 'INPUT' && dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = JSON.stringify(dto.conditions);
      } else if (dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = JSON.stringify(dto.conditions);
      }

      const updated = await this.prisma.step.update({
        where: { id: stepId },
        data: {
          ...dto,
          actions: dto.actions ? JSON.stringify(dto.actions) : undefined,
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          conditions: processedConditions !== undefined ? processedConditions : undefined,
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined,
          description: dto.description || undefined,
        },
        include: {
          assignedToUser: { select: { id: true, name: true, email: true } },
          assignedToSector: { select: { id: true, name: true } },
        },
      });

      return this.parseStepData(updated);
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

  async createNewVersion(processTypeId: string, changes: any) {
  const processType = await this.prisma.processType.findUnique({
    where: { id: processTypeId },
    include: { 
      versions: { 
        orderBy: { version: 'desc' }, 
        take: 1 
      }
    }
  });

  const nextVersion = (processType.versions[0]?.version || 0) + 1;
  
  return this.prisma.processTypeVersion.create({
    data: {
      processTypeId,
      version: nextVersion,
      versionLabel: `v${nextVersion}.0`,
      ...changes,
      steps: {
        create: changes.steps.map((step, index) => ({
          ...step,
          assignments: {
            create: this.buildStepAssignments(step)
          }
        }))
      }
    }
  });
}

async resolveStepAssignments(
  stepVersionId: string, 
  processInstance: ProcessInstance
): Promise<string[]> {
  const assignments = await this.prisma.stepAssignment.findMany({
    where: { stepVersionId, isActive: true },
    orderBy: { priority: 'asc' }
  });

  const resolvedUserIds: string[] = [];

  for (const assignment of assignments) {
    switch (assignment.type) {
      case 'USER':
        if (assignment.userId) {
          resolvedUserIds.push(assignment.userId);
        }
        break;
        
      case 'ROLE':
        const roleUserIds = await this.resolveDynamicRole(
          assignment.dynamicRole, 
          processInstance
        );
        resolvedUserIds.push(...roleUserIds);
        break;
        
      case 'SECTOR':
        const sectorUserIds = await this.getUsersBySector(assignment.sectorId);
        resolvedUserIds.push(...sectorUserIds);
        break;
    }
  }

  return [...new Set(resolvedUserIds)]; // Remove duplicados
}

private async resolveDynamicRole(
  role: DynamicRole, 
  processInstance: ProcessInstance
): Promise<string[]> {
  switch (role) {
    case 'PROCESS_CREATOR':
      return [processInstance.createdById];
      
    case 'SECTOR_MANAGER':
      // Buscar gerente do setor do criador
      const creatorCompany = await this.prisma.userCompany.findFirst({
        where: { 
          userId: processInstance.createdById,
          companyId: processInstance.companyId 
        },
        include: { sector: true }
      });
      
      if (creatorCompany?.sectorId) {
        return this.getManagersBySector(creatorCompany.sectorId);
      }
      break;
      
    case 'COMPANY_ADMIN':
      return this.getCompanyAdmins(processInstance.companyId);
  }
  
  return [];
}

  async removeStep(stepId: string): Promise<void> {
    const step = await this.prisma.step.findUnique({ where: { id: stepId } });
    if (!step) {
      throw new NotFoundException('Etapa não encontrada');
    }

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

  private parseProcessTypeFields(processType: any): any {
    return {
      ...processType,
      steps: processType.steps?.map(step => this.parseStepData(step)) || [],
      formFields: processType.formFields?.map(field => this.parseFormFieldData(field)) || [],
    };
  }

  private parseStepData(step: any): any {
    const parsed = { ...step };

    try {
      if (step.actions && typeof step.actions === 'string') {
        parsed.actions = JSON.parse(step.actions);
      }
    } catch (e) {
      console.warn('Error parsing step actions:', e);
      parsed.actions = [];
    }

    try {
      if (step.conditions && typeof step.conditions === 'string') {
        parsed.conditions = JSON.parse(step.conditions);
      }
    } catch (e) {
      console.warn('Error parsing step conditions:', e);
      parsed.conditions = {};
    }

    try {
      if (step.allowedFileTypes && typeof step.allowedFileTypes === 'string') {
        parsed.allowedFileTypes = JSON.parse(step.allowedFileTypes);
      }
    } catch (e) {
      console.warn('Error parsing step allowedFileTypes:', e);
      parsed.allowedFileTypes = [];
    }

    return parsed;
  }

  private parseFormFieldData(field: any): any {
    const parsed = { ...field };

    try {
      if (field.options && typeof field.options === 'string') {
        parsed.options = JSON.parse(field.options);
      }
    } catch (e) {
      console.warn('Error parsing field options:', e);
      parsed.options = [];
    }

    try {
      if (field.validations && typeof field.validations === 'string') {
        parsed.validations = JSON.parse(field.validations);
      }
    } catch (e) {
      console.warn('Error parsing field validations:', e);
      parsed.validations = {};
    }

    return parsed;
  }

  private async validateSteps(steps: CreateStepDto[], companyId: string): Promise<void> {
    console.log('Validating steps for company:', companyId);

    for (const step of steps) {
      if (!step.assignedToUserId && !step.assignedToSectorId) {
        throw new BadRequestException(`Etapa "${step.name}" deve ter um responsável (usuário ou setor)`);
      }

      if (step.assignedToUserId && step.assignedToSectorId) {
        throw new BadRequestException(`Etapa "${step.name}" não pode ter usuário E setor responsável simultaneamente`);
      }

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

      if (step.minAttachments && step.maxAttachments && step.minAttachments > step.maxAttachments) {
        throw new BadRequestException(`Configuração de anexos inválida na etapa "${step.name}": mínimo não pode ser maior que máximo`);
      }

      if (step.requireAttachment && !step.allowAttachment) {
        throw new BadRequestException(`Configuração inválida na etapa "${step.name}": não é possível exigir anexo sem permitir anexos`);
      }
    }

    console.log('Steps validation passed');
  }
}