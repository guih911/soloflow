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

// Interface estendida para update com versionamento
interface UpdateProcessTypeWithVersioningDto extends UpdateProcessTypeDto {
  steps?: CreateStepDto[];
  formFields?: CreateFormFieldDto[];
}

// Interfaces para compatibilidade com o código existente
interface Step {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  slaHours?: number | null;
  slaDays?: number | null;
  type: any;
  order: number;
  allowAttachment: boolean;
  requiresSignature: boolean;
  requireAttachment: boolean;
  minAttachments?: number | null;
  maxAttachments?: number | null;
  allowedFileTypes?: any;
  conditions?: any;
  assignedToUserId?: string | null;
  assignedToSectorId?: string | null;
  assignedToUser?: any;
  assignedToSector?: any;
  assignedToCreator: boolean;
  reuseData?: any;
  reviewSettings?: any;
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
  tableColumns?: any[];
  minRows?: number;
  maxRows?: number | null;
}

@Injectable()
export class ProcessTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createProcessTypeDto: CreateProcessTypeDto): Promise<ProcessType> {

    const { steps, formFields, allowedChildProcessTypes, ...processTypeData } = createProcessTypeDto;

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
            allowedChildProcessTypes: allowedChildProcessTypes ? JSON.stringify(allowedChildProcessTypes) : undefined,
          },
        });


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
            changelog: 'Versão inicial criada'
          },
        });

        if (steps && steps.length > 0) {
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
          
            // Converter dias para horas para compatibilidade
            const slaHours = step.slaDays ? step.slaDays * 24 : step.slaHours;
          
            let processedConditions: any = step.conditions;
            if (step.type === 'INPUT' && step.conditions && typeof step.conditions === 'object') {
              processedConditions = step.conditions;
            } else if (step.conditions && typeof step.conditions === 'object') {
              processedConditions = step.conditions;
            }
          
            // Assinaturas só são permitidas para etapas UPLOAD ou SIGNATURE
              const allowsSignature = step.type === 'UPLOAD' || step.type === 'SIGNATURE';
              const stepVersion = await tx.stepVersion.create({
              data: {
                name: step.name,
                description: step.description,
                instructions: step.instructions?.trim() || undefined,
                slaHours: slaHours || undefined,
                slaDays: step.slaDays || undefined,
                type: step.type,
                order: step.order || (i + 1),
                allowAttachment: step.allowAttachment || false,
                requiresSignature: allowsSignature ? (step.requiresSignature || false) : false,
                requireAttachment: step.requireAttachment || false,
                minAttachments: step.minAttachments || undefined,
                maxAttachments: step.maxAttachments || undefined,
                allowedFileTypes: step.allowedFileTypes ? JSON.stringify(step.allowedFileTypes) : undefined,
                conditions: processedConditions || undefined,

                // Novos campos
                assignedToCreator: step.assignedToCreator || false,

                processTypeVersionId: version.id,
              },
            });
          
            // Criar assignments apenas se não for assignedToCreator
            if (!step.assignedToCreator) {
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
              
              // Se houver condições de atribuição
              if (step.assignmentConditions) {
                await tx.stepAssignment.create({
                  data: {
                    stepVersionId: stepVersion.id,
                    type: 'CONDITIONAL',
                    priority: 0,
                    isActive: true,
                    conditionalConfig: step.assignmentConditions,
                  },
                });
              }
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
                tableColumns: field.tableColumns ? JSON.stringify(field.tableColumns) : undefined,
                minRows: field.minRows || undefined,
                maxRows: field.maxRows || undefined,
                processTypeVersionId: version.id,
              },
            });
          }
        }

        // ✅ Vincular automaticamente o tipo de processo aos perfis que têm permissão de gerenciar process_types
        const profilesWithPermission = await tx.profiles.findMany({
          where: {
            companyId: processTypeData.companyId,
            profile_permissions: {
              some: {
                OR: [
                  { resource: 'process_types', action: 'manage' },
                  { resource: 'process_types', action: 'create' },
                  { resource: '*', action: '*' },
                ],
              },
            },
          },
        });

        // Criar vinculação com cada perfil que tem permissão
        for (const profile of profilesWithPermission) {
          const { v4: uuidv4 } = await import('uuid');
          await tx.profile_process_types.create({
            data: {
              id: uuidv4(),
              profileId: profile.id,
              processTypeId: processType.id,
              canView: true,
              canCreate: true,
              canExecute: true,
              updatedAt: new Date(),
            },
          });
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
      throw new BadRequestException('Erro ao criar tipo de processo: ' + error.message);
    }
  }

  async findAll(companyId: string): Promise<ProcessType[]> {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }


    const processTypes = await this.prisma.processType.findMany({
      where: {
        companyId
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

  // IMPLEMENTAÇÃO DO VERSIONAMENTO NO UPDATE
  async update(id: string, dto: UpdateProcessTypeWithVersioningDto): Promise<ProcessType> {
    
    // Log específico para campos TABLE

    // Se está apenas atualizando campos simples sem steps/formFields, usar updateBasic
    const isSimpleUpdate = !dto.steps && !dto.formFields && (
      dto.isActive !== undefined || 
      dto.name !== undefined || 
      dto.description !== undefined ||
      dto.allowSubProcesses !== undefined ||
      dto.allowSubTasks !== undefined ||
      dto.isChildProcessOnly !== undefined ||
      dto.allowedChildProcessTypes !== undefined
    );

    if (isSimpleUpdate) {
      return this.updateBasic(id, dto);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Encontrar o ProcessType principal
        const processType = await tx.processType.findUnique({
          where: { id },
          include: {
            versions: {
              where: { isActive: true },
              include: {
                steps: {
                  orderBy: { order: 'asc' },
                  include: {
                    assignments: true
                  }
                },
                formFields: { orderBy: { order: 'asc' } }
              }
            }
          }
        });

        if (!processType) {
          throw new NotFoundException('Tipo de processo não encontrado');
        }

        const currentVersion = processType.versions[0];
        if (!currentVersion) {
          throw new NotFoundException('Versão ativa não encontrada');
        }

        // 2. Desativar a versão atual
        await tx.processTypeVersion.update({
          where: { id: currentVersion.id },
          data: { isActive: false }
        });

        // 3. Criar nova versão incrementada
        const newVersionNumber = currentVersion.version + 1;
        const newVersion = await tx.processTypeVersion.create({
          data: {
            processTypeId: id,
            version: newVersionNumber,
            versionLabel: `v${newVersionNumber}.0`,
            description: dto.description || currentVersion.description,
            isActive: true,
            isDraft: false,
            publishedAt: new Date(),
            changelog: `Versão ${newVersionNumber} - Atualização automática`
          }
        });

        // 4. Criar novos FormFieldVersions baseados no DTO ou manter os existentes
        let formFieldsToCreate: any[] = [];
        
        if (dto.formFields && Array.isArray(dto.formFields)) {
          // Se vêm fields novos do DTO, usar eles
          formFieldsToCreate = dto.formFields;
        } else if (currentVersion.formFields && currentVersion.formFields.length > 0) {
          // Se não vêm fields novos, recriar os existentes na nova versão
          formFieldsToCreate = currentVersion.formFields.map(existingField => ({
            name: existingField.name,
            label: existingField.label,
            type: existingField.type,
            placeholder: existingField.placeholder,
            required: existingField.required,
            order: existingField.order,
            options: existingField.options,
            validations: existingField.validations,
            defaultValue: existingField.defaultValue,
            helpText: existingField.helpText,
            tableColumns: existingField.tableColumns,
            minRows: existingField.minRows,
            maxRows: existingField.maxRows,
          }));
        }
        
        if (formFieldsToCreate && formFieldsToCreate.length > 0) {
          for (let i = 0; i < formFieldsToCreate.length; i++) {
            const field = formFieldsToCreate[i];
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
                tableColumns: field.tableColumns ? JSON.stringify(field.tableColumns) : undefined,
                minRows: field.minRows || undefined,
                maxRows: field.maxRows || undefined,
                processTypeVersionId: newVersion.id,
              },
            });
          }
        }

        // 5. Criar novos StepVersions baseados no DTO ou manter os existentes
        let stepsToCreate: any[] = [];
        
        if (dto.steps && Array.isArray(dto.steps)) {
          // Se vêm steps novos do DTO, usar eles
          stepsToCreate = dto.steps;
          // Validar steps antes de criar
          await this.validateSteps(dto.steps, processType.companyId);
        } else if (currentVersion.steps && currentVersion.steps.length > 0) {
          // Se não vêm steps novos, recriar os existentes na nova versão
          stepsToCreate = currentVersion.steps.map(existingStep => {
            // Extrair assignments existentes para compatibilidade
            const userAssignment = existingStep.assignments?.find(a => a.type === 'USER');
            const sectorAssignment = existingStep.assignments?.find(a => a.type === 'SECTOR');
            
            return {
              name: existingStep.name,
              description: existingStep.description,
              instructions: existingStep.instructions,
              slaHours: existingStep.slaHours,
              slaDays: existingStep.slaDays,
              type: existingStep.type,
              order: existingStep.order,
              allowAttachment: existingStep.allowAttachment,
              requiresSignature: existingStep.requiresSignature,
              requireAttachment: existingStep.requireAttachment,
              minAttachments: existingStep.minAttachments,
              maxAttachments: existingStep.maxAttachments,
              allowedFileTypes: existingStep.allowedFileTypes,
              conditions: existingStep.conditions,
              assignedToCreator: existingStep.assignedToCreator,
              // Mapear assignments de volta para campos compatíveis
              assignedToUserId: userAssignment?.userId || null,
              assignedToSectorId: sectorAssignment?.sectorId || null,
            };
          });
        }
        
        if (stepsToCreate && stepsToCreate.length > 0) {
          for (let i = 0; i < stepsToCreate.length; i++) {
            const step = stepsToCreate[i];
            
            // Converter dias para horas para compatibilidade
            const slaHours = step.slaDays ? step.slaDays * 24 : step.slaHours;
            
            let processedConditions: any = step.conditions;
            if (step.type === 'INPUT' && step.conditions && typeof step.conditions === 'object') {
              processedConditions = step.conditions;
            } else if (step.conditions && typeof step.conditions === 'object') {
              processedConditions = step.conditions;
            }
            
            // Assinaturas só são permitidas para etapas UPLOAD ou SIGNATURE
            const allowsSignatureUpdate = step.type === 'UPLOAD' || step.type === 'SIGNATURE';
            const newStepVersion = await tx.stepVersion.create({
              data: {
                name: step.name,
                description: step.description,
                instructions: step.instructions?.trim() || undefined,
                slaHours: slaHours || undefined,
                slaDays: step.slaDays || undefined,
                type: step.type,
                order: step.order || (i + 1),
                allowAttachment: step.allowAttachment || false,
                requiresSignature: allowsSignatureUpdate ? (step.requiresSignature || false) : false,
                requireAttachment: step.requireAttachment || false,
                minAttachments: step.minAttachments || undefined,
                maxAttachments: step.maxAttachments || undefined,
                allowedFileTypes: step.allowedFileTypes ? JSON.stringify(step.allowedFileTypes) : undefined,
                conditions: processedConditions || undefined,

                // Novos campos
                assignedToCreator: step.assignedToCreator || false,
                reuseData: step.reuseData ? JSON.stringify(step.reuseData) : undefined,
                reviewSettings: step.reviewSettings ? JSON.stringify(step.reviewSettings) : undefined,

                processTypeVersionId: newVersion.id,
              },
            });

            // Criar assignments para a nova versão da etapa
            if (!step.assignedToCreator) {
              if (step.assignedToUserId) {
                await tx.stepAssignment.create({
                  data: {
                    stepVersionId: newStepVersion.id,
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
                    stepVersionId: newStepVersion.id,
                    type: 'SECTOR',
                    sectorId: step.assignedToSectorId,
                    priority: 1,
                    isActive: true,
                  },
                });
              }
              
              // Se houver condições de atribuição
              if (step.assignmentConditions) {
                await tx.stepAssignment.create({
                  data: {
                    stepVersionId: newStepVersion.id,
                    type: 'CONDITIONAL',
                    priority: 0,
                    isActive: true,
                    conditionalConfig: step.assignmentConditions,
                  },
                });
              }
            }
          }
        }

        // 6. Atualizar o ProcessType principal com a nova versão
        const updateData: any = {
          name: dto.name || processType.name,
          description: dto.description || processType.description,
          updatedAt: new Date()
        };

        // Atualizar isChildProcessOnly se fornecido
        if (dto.isChildProcessOnly !== undefined) {
          updateData.isChildProcessOnly = dto.isChildProcessOnly;
        }

        // Atualizar allowSubProcesses se fornecido
        if (dto.allowSubProcesses !== undefined) {
          updateData.allowSubProcesses = dto.allowSubProcesses;
        }

        // Atualizar allowSubTasks se fornecido
        if (dto.allowSubTasks !== undefined) {
          updateData.allowSubTasks = dto.allowSubTasks;
        }

        // Atualizar allowedChildProcessTypes se fornecido
        if (dto.allowedChildProcessTypes !== undefined) {
          updateData.allowedChildProcessTypes = dto.allowedChildProcessTypes
            ? JSON.stringify(dto.allowedChildProcessTypes)
            : null;
        }

        const updatedProcessType = await tx.processType.update({
          where: { id },
          data: updateData,
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

        return this.adaptProcessTypeResponse(updatedProcessType);
      });

    } catch (error) {
      throw new BadRequestException('Erro ao atualizar tipo de processo: ' + error.message);
    }
  }

  // Método para updates simples (sem versionamento completo)
  async updateBasic(id: string, dto: UpdateProcessTypeDto): Promise<ProcessType> {
    const { formFields, allowedChildProcessTypes, ...safeDto } = dto as any;

    try {
      const updated = await this.prisma.processType.update({
        where: { id },
        data: {
          ...safeDto,
          description: safeDto.description || undefined,
          allowedChildProcessTypes: allowedChildProcessTypes !== undefined
            ? (allowedChildProcessTypes ? JSON.stringify(allowedChildProcessTypes) : null)
            : undefined,
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
          tableColumns: dto.tableColumns ? JSON.stringify(dto.tableColumns) : undefined,
          minRows: dto.minRows || undefined,
          maxRows: dto.maxRows || undefined,
          processTypeVersionId: version.id,
        },
      });

      return this.adaptFormFieldResponse(created);
    } catch (error) {
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

      // Assinaturas só são permitidas para etapas UPLOAD ou SIGNATURE
      const allowsSignatureAdd = dto.type === 'UPLOAD' || dto.type === 'SIGNATURE';
      const created = await this.prisma.stepVersion.create({
        data: {
          name: dto.name,
          description: dto.description,
          instructions: dto.instructions?.trim() || undefined,
          slaHours: dto.slaHours || undefined,
          type: dto.type,
          order: dto.order,
          allowAttachment: dto.allowAttachment || false,
          requiresSignature: allowsSignatureAdd ? (dto.requiresSignature || false) : false,
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

      // Assinaturas só são permitidas para etapas UPLOAD ou SIGNATURE
      const allowsSignatureEdit = dto.type === 'UPLOAD' || dto.type === 'SIGNATURE';
      
      // Preparar reuseData se fornecido
      let reuseDataToSave = undefined;
      if (dto.reuseData !== undefined) {
        reuseDataToSave = Array.isArray(dto.reuseData) 
          ? JSON.stringify(dto.reuseData)
          : dto.reuseData;
      }
      
      // Preparar reviewSettings se fornecido
      let reviewSettingsToSave: any = undefined;
      if (dto.reviewSettings !== undefined) {
        reviewSettingsToSave = dto.reviewSettings 
          ? JSON.stringify(dto.reviewSettings)
          : undefined;
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
          requiresSignature: allowsSignatureEdit ? dto.requiresSignature : false,
          requireAttachment: dto.requireAttachment,
          minAttachments: dto.minAttachments,
          maxAttachments: dto.maxAttachments,
          allowedFileTypes: dto.allowedFileTypes ? JSON.stringify(dto.allowedFileTypes) : undefined,
          conditions: processedConditions !== undefined ? processedConditions : undefined,
          reuseData: reuseDataToSave,
          reviewSettings: reviewSettingsToSave,
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
      throw new BadRequestException('Erro ao remover etapa: ' + error.message);
    }
  }

  // Métodos auxiliares para adaptação de dados
  private adaptProcessTypeResponse(processType: any): any {
    const activeVersion = processType.versions?.[0];
    if (!activeVersion) return processType;

    // Parse allowedChildProcessTypes se for string JSON
    let allowedChildProcessTypes = processType.allowedChildProcessTypes;
    try {
      if (allowedChildProcessTypes && typeof allowedChildProcessTypes === 'string') {
        allowedChildProcessTypes = JSON.parse(allowedChildProcessTypes);
      }
    } catch (e) {
      allowedChildProcessTypes = [];
    }

    return {
      ...processType,
      allowSubProcesses: processType.allowSubProcesses ?? true,
      allowSubTasks: processType.allowSubTasks ?? true,
      allowedChildProcessTypes: allowedChildProcessTypes || [],
      steps: activeVersion.steps?.map(step => this.adaptStepResponse(step)) || [],
      formFields: activeVersion.formFields?.map(field => this.adaptFormFieldResponse(field)) || [],
      _count: { instances: activeVersion.instances?.length || 0 },
      version: activeVersion.version,
      versionLabel: activeVersion.versionLabel,
    };
  }
    
  private adaptStepResponse(stepVersion: any): Step {
    
    const userAssignment = stepVersion.assignments?.find(a => a.type === 'USER');
    const sectorAssignment = stepVersion.assignments?.find(a => a.type === 'SECTOR');
    const conditionalAssignment = stepVersion.assignments?.find(a => a.type === 'CONDITIONAL');
  
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

    let parsedReuseData = stepVersion.reuseData;
    try {
      if (stepVersion.reuseData && typeof stepVersion.reuseData === 'string') {
        parsedReuseData = JSON.parse(stepVersion.reuseData);
      }
    } catch (e) {
      parsedReuseData = stepVersion.reuseData;
    }

    let parsedReviewSettings = stepVersion.reviewSettings;
    try {
      if (stepVersion.reviewSettings && typeof stepVersion.reviewSettings === 'string') {
        parsedReviewSettings = JSON.parse(stepVersion.reviewSettings);
      }
    } catch (e) {
      parsedReviewSettings = stepVersion.reviewSettings;
    }
  
    return {
      id: stepVersion.id,
      name: stepVersion.name,
      description: stepVersion.description,
      instructions: stepVersion.instructions,
      slaHours: stepVersion.slaHours,
      slaDays: stepVersion.slaDays,
      type: stepVersion.type,
      order: stepVersion.order,
      allowAttachment: stepVersion.allowAttachment,
      requiresSignature: stepVersion.requiresSignature,
      requireAttachment: stepVersion.requireAttachment,
      minAttachments: stepVersion.minAttachments,
      maxAttachments: stepVersion.maxAttachments,
      allowedFileTypes: parsedAllowedFileTypes,
      conditions: parsedConditions,
      reuseData: parsedReuseData,
      reviewSettings: parsedReviewSettings,

      // Novos campos
      assignedToCreator: stepVersion.assignedToCreator || false,

      // Compatibilidade com o frontend existente
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

    let parsedTableColumns = fieldVersion.tableColumns;
    try {
      if (fieldVersion.tableColumns && typeof fieldVersion.tableColumns === 'string') {
        parsedTableColumns = JSON.parse(fieldVersion.tableColumns);
      }
    } catch (e) {
      parsedTableColumns = fieldVersion.tableColumns;
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
      tableColumns: parsedTableColumns || [],
      minRows: fieldVersion.minRows || 0,
      maxRows: fieldVersion.maxRows || null,
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

    for (const step of steps) {
      // Responsável é opcional - se não tiver, a tarefa ficará disponível para qualquer um do setor/empresa
      // A validação de responsável foi removida para permitir mais flexibilidade

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

  }
}