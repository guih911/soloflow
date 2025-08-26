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
import { ProcessType } from '@prisma/client';

// Interfaces para compatibilidade com o código existente
interface Step {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  slaHours?: number | null;
  type: any;
  order: number;
  allowAttachment: boolean;
  requiresSignature: boolean;
  requireAttachment: boolean;
  minAttachments?: number | null;
  maxAttachments?: number | null;
  allowedFileTypes?: any;
  conditions?: any;
  actions?: any;
  assignedToUserId?: string | null;
  assignedToSectorId?: string | null;
  assignedToUser?: any;
  assignedToSector?: any;
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: any;
  placeholder?: string | null;
  required: boolean;
  order: number;
  options?: any;
  validations?: any;
  defaultValue?: string | null;
  helpText?: string | null;
}

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

        // Criar versão inicial
        const version = await tx.processTypeVersion.create({
          data: {
            processTypeId: processType.id,
            version: 1,
            versionLabel: 'v1.0',
            description: processTypeData.description,
            isActive: true,
            isDraft: false,
            publishedAt: new Date(),
          },
        });

        if (steps && steps.length > 0) {
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            let processedConditions: any = step.conditions;
            if (step.type === 'INPUT' && step.conditions && typeof step.conditions === 'object') {
              processedConditions = step.conditions;
            } else if (step.conditions && typeof step.conditions === 'object') {
              processedConditions = step.conditions;
            }

            const stepVersion = await tx.stepVersion.create({
              data: {
                name: step.name,
                description: step.description,
                instructions: step.instructions?.trim() || undefined,
                slaHours: step.slaHours || undefined,
                type: step.type,
                order: step.order || (i + 1),
                allowAttachment: step.allowAttachment || false,
                requiresSignature: step.requiresSignature || false,
                requireAttachment: step.requireAttachment || false,
                minAttachments: step.minAttachments || undefined,
                maxAttachments: step.maxAttachments || undefined,
                allowedFileTypes: step.allowedFileTypes ? JSON.stringify(step.allowedFileTypes) : undefined,
                conditions: processedConditions || undefined,
                processTypeVersionId: version.id,
              },
            });

            // Criar assignments
            if (step.assignedToUserId) {
              await tx.stepAssignment.create({
                data: {
                  stepVersionId: stepVersion.id,
                  type: 'USER',
                  userId: step.assignedToUserId,
                  priority: 1,
                  isActive: true,
                },
              });
            }

            if (step.assignedToSectorId) {
              await tx.stepAssignment.create({
                data: {
                  stepVersionId: stepVersion.id,
                  type: 'SECTOR',
                  sectorId: step.assignedToSectorId,
                  priority: 1,
                  isActive: true,
                },
              });
            }
          }
        }

        if (formFields && formFields.length > 0) {
          for (let i = 0; i < formFields.length; i++) {
            const field = formFields[i];
            await tx.formFieldVersion.create({
              data: {
                name: field.name,
                label: field.label,
                type: field.type,
                placeholder: field.placeholder || undefined,
                required: field.required,
                order: field.order || (i + 1),
                options: field.options ? JSON.stringify(field.options) : undefined,
                validations: field.validations ? JSON.stringify(field.validations) : undefined,
                defaultValue: field.defaultValue || undefined,
                helpText: field.helpText || undefined,
                processTypeVersionId: version.id,
              },
            });
          }
        }

        const fullProcessType = await tx.processType.findUnique({
          where: { id: processType.id },
          include: {
            versions: {
              where: { isActive: true },
              include: {
                steps: { 
                  orderBy: { order: 'asc' },
                  include: {
                    assignments: {
                      include: {
                        user: { select: { id: true, name: true, email: true } },
                        sector: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
                formFields: { orderBy: { order: 'asc' } },
              },
            },
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

        return this.adaptProcessTypeResponse(fullProcessType);
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
        versions: {
          where: { isActive: true },
          include: {
            steps: { 
              orderBy: { order: 'asc' },
              include: {
                assignments: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    sector: { select: { id: true, name: true } },
                  },
                },
              },
            },
            formFields: { orderBy: { order: 'asc' } },
            instances: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return processTypes.map(pt => this.adaptProcessTypeResponse(pt));
  }

  async findOne(id: string): Promise<ProcessType> {
    const processType = await this.prisma.processType.findUnique({
      where: { id },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: {
                assignments: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    sector: { select: { id: true, name: true } },
                  },
                },
              },
            },
            formFields: { orderBy: { order: 'asc' } },
          },
        },
        company: true,
      },
    });

    if (!processType) {
      throw new NotFoundException('Tipo de processo não encontrado');
    }

    return this.adaptProcessTypeResponse(processType);
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
          versions: {
            where: { isActive: true },
            include: {
              steps: { 
                orderBy: { order: 'asc' },
                include: {
                  assignments: {
                    include: {
                      user: { select: { id: true, name: true, email: true } },
                      sector: { select: { id: true, name: true } },
                    },
                  },
                },
              },
              formFields: { orderBy: { order: 'asc' } },
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return this.adaptProcessTypeResponse(updated);
    } catch (error) {
      console.error('Error updating process type:', error);
      throw new BadRequestException('Erro ao atualizar tipo de processo: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    const processType = await this.findOne(id);
    
    try {
      await this.prisma.processType.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      console.error('Error removing process type:', error);
      throw new BadRequestException('Erro ao remover tipo de processo: ' + error.message);
    }
  }

  async addFormField(processTypeId: string, dto: CreateFormFieldDto): Promise<FormField> {
    const processType = await this.findOne(processTypeId);
    const version = await this.getActiveVersion(processTypeId);

    try {
      const created = await this.prisma.formFieldVersion.create({
        data: {
          name: dto.name,
          label: dto.label,
          type: dto.type,
          placeholder: dto.placeholder || undefined,
          required: dto.required,
          order: dto.order,
          options: dto.options ? JSON.stringify(dto.options) : undefined,
          validations: dto.validations ? JSON.stringify(dto.validations) : undefined,
          defaultValue: dto.defaultValue || undefined,
          helpText: dto.helpText || undefined,
          processTypeVersionId: version.id,
        },
      });

      return this.adaptFormFieldResponse(created);
    } catch (error) {
      console.error('Error adding form field:', error);
      throw new BadRequestException('Erro ao adicionar campo: ' + error.message);
    }
  }

  async updateFormField(fieldId: string, dto: UpdateFormFieldDto): Promise<FormField> {
    const field = await this.prisma.formFieldVersion.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    try {
      const updated = await this.prisma.formFieldVersion.update({
        where: { id: fieldId },
        data: {
          name: dto.name,
          label: dto.label,
          type: dto.type,
          placeholder: dto.placeholder || undefined,
          required: dto.required,
          options: dto.options ? JSON.stringify(dto.options) : undefined,
          validations: dto.validations ? JSON.stringify(dto.validations) : undefined,
          defaultValue: dto.defaultValue || undefined,
          helpText: dto.helpText || undefined,
        },
      });

      return this.adaptFormFieldResponse(updated);
    } catch (error) {
      console.error('Error updating form field:', error);
      throw new BadRequestException('Erro ao atualizar campo: ' + error.message);
    }
  }

  async removeFormField(fieldId: string): Promise<void> {
    const field = await this.prisma.formFieldVersion.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new NotFoundException('Campo não encontrado');
    }

    try {
      await this.prisma.formFieldVersion.delete({ where: { id: fieldId } });
    } catch (error) {
      console.error('Error removing form field:', error);
      throw new BadRequestException('Erro ao remover campo: ' + error.message);
    }
  }

  async addStep(processTypeId: string, dto: CreateStepDto): Promise<Step> {
    const processType = await this.findOne(processTypeId);
    const version = await this.getActiveVersion(processTypeId);
    await this.validateSteps([dto], processType.companyId);

    try {
      let processedConditions: any = dto.conditions;
      if (dto.type === 'INPUT' && dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = dto.conditions;
      } else if (dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = dto.conditions;
      }

      const created = await this.prisma.stepVersion.create({
        data: {
          name: dto.name,
          description: dto.description,
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          type: dto.type,
          order: dto.order,
          allowAttachment: dto.allowAttachment || false,
          requiresSignature: dto.requiresSignature || false,
          requireAttachment: dto.requireAttachment || false,
          minAttachments: dto.minAttachments || undefined,
          maxAttachments: dto.maxAttachments || undefined,
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined,
          conditions: processedConditions || undefined,
          processTypeVersionId: version.id,
        },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              sector: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Criar assignments
      if (dto.assignedToUserId) {
        await this.prisma.stepAssignment.create({
          data: {
            stepVersionId: created.id,
            type: 'USER',
            userId: dto.assignedToUserId,
            priority: 1,
            isActive: true,
          },
        });
      }

      if (dto.assignedToSectorId) {
        await this.prisma.stepAssignment.create({
          data: {
            stepVersionId: created.id,
            type: 'SECTOR',
            sectorId: dto.assignedToSectorId,
            priority: 1,
            isActive: true,
          },
        });
      }

      return this.adaptStepResponse(created);
    } catch (error) {
      console.error('Error adding step:', error);
      throw new BadRequestException('Erro ao adicionar etapa: ' + error.message);
    }
  }

  async updateStep(stepId: string, dto: Partial<CreateStepDto>): Promise<Step> {
    const step = await this.prisma.stepVersion.findUnique({
      where: { id: stepId },
      include: { processTypeVersion: { include: { processType: true } } },
    });

    if (!step) {
      throw new NotFoundException('Etapa não encontrada');
    }

    if (dto.assignedToUserId || dto.assignedToSectorId) {
      await this.validateSteps([dto as CreateStepDto], step.processTypeVersion.processType.companyId);
    }

    try {
      let processedConditions: any = dto.conditions;
      if (dto.type === 'INPUT' && dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = dto.conditions;
      } else if (dto.conditions && typeof dto.conditions === 'object') {
        processedConditions = dto.conditions;
      }

      const updated = await this.prisma.stepVersion.update({
        where: { id: stepId },
        data: {
          name: dto.name,
          description: dto.description,
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          type: dto.type,
          order: dto.order,
          allowAttachment: dto.allowAttachment,
          requiresSignature: dto.requiresSignature,
          requireAttachment: dto.requireAttachment,
          minAttachments: dto.minAttachments,
          maxAttachments: dto.maxAttachments,
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined,
          conditions: processedConditions !== undefined ? processedConditions : undefined,
        },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              sector: { select: { id: true, name: true } },
            },
          },
        },
      });

      return this.adaptStepResponse(updated);
    } catch (error) {
      console.error('Error updating step:', error);
      throw new BadRequestException('Erro ao atualizar etapa: ' + error.message);
    }
  }

  async removeStep(stepId: string): Promise<void> {
    const step = await this.prisma.stepVersion.findUnique({ where: { id: stepId } });
    if (!step) {
      throw new NotFoundException('Etapa não encontrada');
    }

    const executions = await this.prisma.stepExecution.count({ where: { stepVersionId: stepId } });
    if (executions > 0) {
      throw new BadRequestException('Não é possível remover etapa com execuções');
    }

    try {
      await this.prisma.stepVersion.delete({ where: { id: stepId } });
    } catch (error) {
      console.error('Error removing step:', error);
      throw new BadRequestException('Erro ao remover etapa: ' + error.message);
    }
  }

  // Métodos auxiliares para adaptação de dados
  private adaptProcessTypeResponse(processType: any): any {
    const activeVersion = processType.versions?.[0];
    if (!activeVersion) return processType;

    return {
      ...processType,
      steps: activeVersion.steps?.map(step => this.adaptStepResponse(step)) || [],
      formFields: activeVersion.formFields?.map(field => this.adaptFormFieldResponse(field)) || [],
      _count: { instances: activeVersion.instances?.length || 0 },
    };
  }

  private adaptStepResponse(stepVersion: any): Step {
    const userAssignment = stepVersion.assignments?.find(a => a.type === 'USER');
    const sectorAssignment = stepVersion.assignments?.find(a => a.type === 'SECTOR');

    let parsedConditions = stepVersion.conditions;
    try {
      if (stepVersion.conditions && typeof stepVersion.conditions === 'string') {
        parsedConditions = JSON.parse(stepVersion.conditions);
      }
    } catch (e) {
      parsedConditions = stepVersion.conditions;
    }

    let parsedAllowedFileTypes = stepVersion.allowedFileTypes;
    try {
      if (stepVersion.allowedFileTypes && typeof stepVersion.allowedFileTypes === 'string') {
        parsedAllowedFileTypes = JSON.parse(stepVersion.allowedFileTypes);
      }
    } catch (e) {
      parsedAllowedFileTypes = stepVersion.allowedFileTypes;
    }

    return {
      id: stepVersion.id,
      name: stepVersion.name,
      description: stepVersion.description,
      instructions: stepVersion.instructions,
      slaHours: stepVersion.slaHours,
      type: stepVersion.type,
      order: stepVersion.order,
      allowAttachment: stepVersion.allowAttachment,
      requiresSignature: stepVersion.requiresSignature,
      requireAttachment: stepVersion.requireAttachment,
      minAttachments: stepVersion.minAttachments,
      maxAttachments: stepVersion.maxAttachments,
      allowedFileTypes: parsedAllowedFileTypes,
      conditions: parsedConditions,
      actions: [], // Será implementado conforme necessário
      assignedToUserId: userAssignment?.userId || null,
      assignedToSectorId: sectorAssignment?.sectorId || null,
      assignedToUser: userAssignment?.user || null,
      assignedToSector: sectorAssignment?.sector || null,
    };
  }

  private adaptFormFieldResponse(fieldVersion: any): FormField {
    let parsedOptions = fieldVersion.options;
    try {
      if (fieldVersion.options && typeof fieldVersion.options === 'string') {
        parsedOptions = JSON.parse(fieldVersion.options);
      }
    } catch (e) {
      parsedOptions = fieldVersion.options;
    }

    let parsedValidations = fieldVersion.validations;
    try {
      if (fieldVersion.validations && typeof fieldVersion.validations === 'string') {
        parsedValidations = JSON.parse(fieldVersion.validations);
      }
    } catch (e) {
      parsedValidations = fieldVersion.validations;
    }

    return {
      id: fieldVersion.id,
      name: fieldVersion.name,
      label: fieldVersion.label,
      type: fieldVersion.type,
      placeholder: fieldVersion.placeholder,
      required: fieldVersion.required,
      order: fieldVersion.order,
      options: parsedOptions,
      validations: parsedValidations,
      defaultValue: fieldVersion.defaultValue,
      helpText: fieldVersion.helpText,
    };
  }

  private async getActiveVersion(processTypeId: string) {
    const version = await this.prisma.processTypeVersion.findFirst({
      where: { processTypeId, isActive: true },
    });

    if (!version) {
      throw new NotFoundException('Versão ativa não encontrada');
    }

    return version;
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