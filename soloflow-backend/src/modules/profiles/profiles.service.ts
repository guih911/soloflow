import { ConflictException, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProfileDto, ProfilePermissionInput, ProfileProcessTypeInput } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CacheService } from '../cache/cache.service';

type ResolvedPermissions = {
  profileIds: string[];
  permissions: {
    resource: string;
    action: string;
    scope?: Record<string, any> | null;
  }[];
  processTypes: {
    processTypeId: string;
    canView: boolean;
    canCreate: boolean;
    canExecute: boolean;
  }[];
};

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private buildPermissionCreates(
    inputs?: ProfilePermissionInput[],
  ): Prisma.profile_permissionsCreateWithoutProfilesInput[] | undefined {
    if (!inputs?.length) {
      return undefined;
    }
    return inputs.map(
      (permission): Prisma.profile_permissionsCreateWithoutProfilesInput => ({
        id: randomUUID(),
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ? (permission.scope as Prisma.InputJsonValue) : Prisma.DbNull,
      }),
    );
  }

  private buildProcessTypeCreates(
    inputs?: ProfileProcessTypeInput[],
  ): Prisma.profile_process_typesUncheckedCreateWithoutProfilesInput[] | undefined {
    if (!inputs?.length) {
      return undefined;
    }
    return inputs.map((processType): Prisma.profile_process_typesUncheckedCreateWithoutProfilesInput => {
      const processTypeValue = typeof processType.processTypeId === 'object' && processType.processTypeId !== null
        ? (processType.processTypeId as any).id ?? (processType.processTypeId as any).value ?? '*'
        : processType.processTypeId;

      return {
        id: randomUUID(),
        processTypeId: processTypeValue || '*',
        canView: processType.canView ?? true,
        canCreate: processType.canCreate ?? false,
        canExecute: processType.canExecute ?? false,
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Valida se adicionar um perfil pai criaria um ciclo na hierarquia
   */
  private async validateNoCircularHierarchy(
    profileId: string,
    parentProfileId: string,
    visited = new Set<string>(),
  ): Promise<void> {
    if (profileId === parentProfileId) {
      throw new ConflictException('Um perfil não pode ser pai de si mesmo');
    }

    if (visited.has(parentProfileId)) {
      throw new ConflictException('Hierarquia circular detectada');
    }
    visited.add(parentProfileId);

    const parent = await this.prisma.profiles.findUnique({
      where: { id: parentProfileId },
      select: { parentProfileId: true },
    });

    if (parent?.parentProfileId) {
      await this.validateNoCircularHierarchy(profileId, parent.parentProfileId, visited);
    }
  }

  async create(companyId: string, dto: CreateProfileDto & { parentProfileId?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const permissionCreates = this.buildPermissionCreates(dto.permissions);
      const processTypeCreates = this.buildProcessTypeCreates(dto.processTypes);

      // Valida hierarquia se parentProfileId foi fornecido
      if (dto.parentProfileId) {
        await this.ensureProfileInCompany(dto.parentProfileId, companyId);
      }

      if (dto.isDefault) {
        await tx.profiles.updateMany({
          where: {
            companyId,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const dataToCreate: any = {
        id: randomUUID(),
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        updatedAt: new Date(),
        companyId,
      };

      if (dto.parentProfileId) {
        dataToCreate.parentProfileId = dto.parentProfileId;
      }

      if (permissionCreates?.length) {
        dataToCreate.profile_permissions = {
          create: permissionCreates,
        };
      }

      if (processTypeCreates?.length) {
        dataToCreate.profile_process_types = {
          create: processTypeCreates,
        };
      }

      const created = await tx.profiles.create({
        data: dataToCreate,
        include: {
          profile_permissions: true,
          profile_process_types: true,
        },
      });

      return created;
    });
  }

  async ensureProfileInCompany(profileId: string, companyId: string | null) {
    const profile = await this.prisma.profiles.findUnique({
      where: { id: profileId },
      include: {
        companies: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }

    if (profile.companyId && profile.companyId !== companyId) {
      throw new ForbiddenException('Perfil pertence a outra empresa');
    }

    return profile;
  }

  async findAll(companyId: string) {
    return this.prisma.profiles.findMany({
      where: {
        OR: [
          { companyId: null },
          { companyId },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
      include: {
        profile_permissions: true,
        profile_process_types: {
          include: {
            process_types: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const profile = await this.prisma.profiles.findFirst({
      where: {
        id,
        OR: [
          { companyId: null },
          { companyId },
        ],
      },
      include: {
        profile_permissions: true,
        profile_process_types: {
          include: {
            process_types: {
              select: { id: true, name: true },
            },
          },
        },
        user_profiles: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil não encontrado nesta empresa');
    }

    return profile;
  }

  async update(id: string, companyId: string, dto: UpdateProfileDto & { parentProfileId?: string | null }) {
    await this.ensureProfileInCompany(id, companyId);

    const result = await this.prisma.$transaction(async (tx) => {
      // Valida hierarquia se parentProfileId está sendo modificado
      if (dto.parentProfileId !== undefined && dto.parentProfileId !== null) {
        await this.ensureProfileInCompany(dto.parentProfileId, companyId);
        await this.validateNoCircularHierarchy(id, dto.parentProfileId);
      }

      if (dto.isDefault) {
        await tx.profiles.updateMany({
          where: {
            companyId,
            NOT: { id },
          },
          data: { isDefault: false },
        });
      }

      const updated = await tx.profiles.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault,
          isActive: dto.isActive,
          parentProfileId: dto.parentProfileId,
        },
      });

      if (dto.permissions) {
        await tx.profile_permissions.deleteMany({
          where: { profileId: id },
        });

        if (dto.permissions.length) {
          const permissionCreates = this.buildPermissionCreates(dto.permissions);
          if (permissionCreates?.length) {
            await tx.profile_permissions.createMany({
              data: permissionCreates.map((permission) => ({
                ...permission,
                profileId: id,
              })),
            });
          }
        }
      }

      if (dto.processTypes) {
        await tx.profile_process_types.deleteMany({
          where: { profileId: id },
        });

        if (dto.processTypes.length) {
          const processTypeCreates = this.buildProcessTypeCreates(dto.processTypes);
          if (processTypeCreates?.length) {
            await tx.profile_process_types.createMany({
              data: processTypeCreates.map((processType) => ({
                ...processType,
                profileId: id,
              })),
            });
          }
        }
      }

      return this.findOne(updated.id, companyId);
    });

    // Invalida cache de todos os usuários com este perfil
    await this.cacheService.invalidateProfile(id);

    return result;
  }

  async remove(id: string, companyId: string) {
    const profile = await this.ensureProfileInCompany(id, companyId);

    const assignments = await this.prisma.user_profiles.count({
      where: { profileId: id },
    });

    if (assignments > 0) {
      throw new ConflictException('Não é possível remover um perfil que possui usuários vinculados');
    }

    const result = await this.prisma.profiles.delete({
      where: { id: profile.id },
    });

    // Invalida cache (mesmo sem usuários, por precaução)
    await this.cacheService.invalidateProfile(id);

    return result;
  }

  /**
   * Adiciona um perfil a um usuário (permite múltiplos perfis)
   */
  async addProfile(profileId: string, userId: string, companyId: string, assignedBy?: string) {
    await this.ensureProfileInCompany(profileId, companyId);

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('Usuário não pertence a esta empresa');
    }

    // Verifica se o usuário já possui este perfil
    const existing = await this.prisma.user_profiles.findFirst({
      where: {
        userId,
        companyId,
        profileId,
      },
    });

    if (existing) {
      throw new ConflictException('Usuário já possui este perfil');
    }

    const result = await this.prisma.user_profiles.create({
      data: {
        id: randomUUID(),
        userId,
        companyId,
        profileId,
        assignedBy,
      },
      include: {
        profiles: {
          include: {
            profile_permissions: true,
            profile_process_types: true,
          },
        },
      },
    });

    // Invalida cache de permissões do usuário
    await this.cacheService.invalidateUserPermissions(userId, companyId);

    return result;
  }

  /**
   * Atribui perfil (compatibilidade - substitui todos os perfis do usuário por este)
   * @deprecated Use addProfile() para adicionar perfis individuais
   */
  async assignProfile(profileId: string, userId: string, companyId: string, assignedBy?: string) {
    await this.ensureProfileInCompany(profileId, companyId);

    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('Usuário não pertence a esta empresa');
    }

    // Remove todos os perfis existentes
    await this.prisma.user_profiles.deleteMany({
      where: {
        userId,
        companyId,
      },
    });

    // Cria o novo perfil
    const result = await this.prisma.user_profiles.create({
      data: {
        id: randomUUID(),
        userId,
        companyId,
        profileId,
        assignedBy,
      },
      include: {
        profiles: {
          include: {
            profile_permissions: true,
            profile_process_types: true,
          },
        },
      },
    });

    // Invalida cache de permissões do usuário
    await this.cacheService.invalidateUserPermissions(userId, companyId);

    return result;
  }

  /**
   * Remove um perfil específico de um usuário
   */
  async removeProfile(profileId: string, userId: string, companyId: string) {
    const assignment = await this.prisma.user_profiles.findFirst({
      where: {
        userId,
        companyId,
        profileId,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Perfil não atribuído a este usuário');
    }

    const result = await this.prisma.user_profiles.delete({
      where: {
        id: assignment.id,
      },
    });

    // Invalida cache de permissões do usuário
    await this.cacheService.invalidateUserPermissions(userId, companyId);

    return result;
  }

  /**
   * Remove todos os perfis de um usuário em uma empresa
   * @deprecated Use removeProfile() para remover perfis individuais
   */
  async removeAssignment(userId: string, companyId: string) {
    const result = await this.prisma.user_profiles.deleteMany({
      where: {
        userId,
        companyId,
      },
    });

    // Invalida cache de permissões do usuário
    await this.cacheService.invalidateUserPermissions(userId, companyId);

    return result;
  }

  /**
   * Lista todos os usuários que possuem um perfil específico
   */
  async listAssignments(profileId: string, companyId: string) {
    await this.ensureProfileInCompany(profileId, companyId);

    return this.prisma.user_profiles.findMany({
      where: {
        profileId,
        companyId,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Lista todos os perfis de um usuário em uma empresa
   */
  async getUserProfiles(userId: string, companyId: string) {
    return this.prisma.user_profiles.findMany({
      where: {
        userId,
        companyId,
      },
      include: {
        profiles: {
          include: {
            profile_permissions: true,
            profile_process_types: {
              include: {
                process_types: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'asc',
      },
    });
  }

  private mergePermissions(list: ResolvedPermissions['permissions']) {
    const map = new Map<string, ResolvedPermissions['permissions'][number]>();

    list.forEach((permission) => {
      const key = `${permission.resource}:${permission.action}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope ?? null,
        });
      } else if (existing.scope == null && permission.scope != null) {
        map.set(key, {
          ...existing,
          scope: permission.scope,
        });
      }
    });

    return Array.from(map.values());
  }

  private normalizeScope(scope: unknown): Record<string, any> | null {
    if (scope === null || scope === undefined || scope === Prisma.DbNull || scope === Prisma.JsonNull) {
      return null;
    }
    return scope as Record<string, any>;
  }

  private mergeProcessTypePermissions(list: ProfileProcessTypeInput[]): ResolvedPermissions['processTypes'] {
    const map = new Map<string, ResolvedPermissions['processTypes'][number]>();

    list.forEach((item) => {
      const current = {
        processTypeId: item.processTypeId,
        canView: item.canView ?? true,
        canCreate: item.canCreate ?? false,
        canExecute: item.canExecute ?? false,
      };
      const existing = map.get(item.processTypeId);
      if (!existing) {
        map.set(item.processTypeId, current);
      } else {
        map.set(item.processTypeId, {
          processTypeId: item.processTypeId,
          canView: existing.canView || current.canView,
          canCreate: existing.canCreate || current.canCreate,
          canExecute: existing.canExecute || current.canExecute,
        });
      }
    });

    return Array.from(map.values());
  }

  /**
   * ✅ SISTEMA PROFISSIONAL DE PERFIS
   *
   * Não usa fallback baseado em role.
   * Todo usuário DEVE ter um perfil atribuído.
   *
   * Role (ADMIN/MANAGER/USER) é usado apenas para:
   * - Controle de acesso a endpoints administrativos (@Roles decorator)
   * - Não define permissões de telas/funcionalidades
   *
   * Perfis personalizados definem:
   * - Quais telas o usuário pode acessar
   * - Quais ações pode realizar
   * - Quais tipos de processo pode gerenciar
   */
  private getEmptyPermissions(): ResolvedPermissions {
    return {
      profileIds: [],
      permissions: [],
      processTypes: [],
    };
  }

  /**
   * Resolve as permissões de um perfil, incluindo herança da hierarquia
   */
  private async resolveProfileHierarchy(profileId: string, visited = new Set<string>()): Promise<{
    permissions: ResolvedPermissions['permissions'];
    processTypes: ProfileProcessTypeInput[];
  }> {
    // Evita recursão infinita
    if (visited.has(profileId)) {
      return { permissions: [], processTypes: [] };
    }
    visited.add(profileId);

    const profile = await this.prisma.profiles.findUnique({
      where: { id: profileId },
      include: {
        profile_permissions: true,
        profile_process_types: true,
        parentProfile: true,
      },
    });

    if (!profile) {
      return { permissions: [], processTypes: [] };
    }

    const allPermissions: ResolvedPermissions['permissions'] = [];
    const processTypePermissions: ProfileProcessTypeInput[] = [];

    // Se há perfil pai, herda suas permissões primeiro (ordem: pai -> filho)
    if (profile.parentProfile) {
      const inherited = await this.resolveProfileHierarchy(profile.parentProfile.id, visited);
      allPermissions.push(...inherited.permissions);
      processTypePermissions.push(...inherited.processTypes);
    }

    // Adiciona as permissões do perfil atual (sobrescrevem as herdadas)
    profile.profile_permissions.forEach((permission) => {
      allPermissions.push({
        resource: permission.resource,
        action: permission.action,
        scope: this.normalizeScope(permission.scope),
      });
    });

    profile.profile_process_types.forEach((processPermission) => {
      processTypePermissions.push({
        processTypeId: processPermission.processTypeId,
        canView: processPermission.canView,
        canCreate: processPermission.canCreate,
        canExecute: processPermission.canExecute,
      });
    });

    return { permissions: allPermissions, processTypes: processTypePermissions };
  }

  async resolveUserPermissions(userId: string, companyId: string): Promise<ResolvedPermissions> {
    // Tenta obter do cache primeiro
    const cacheKey = this.cacheService.getUserPermissionsCacheKey(userId, companyId);
    const cached = await this.cacheService.get<ResolvedPermissions>(cacheKey);

    if (cached) {
      return cached;
    }

    // Se não está em cache, busca do banco de dados
    const assignments = await this.prisma.user_profiles.findMany({
      where: {
        userId,
        companyId,
      },
      include: {
        profiles: true,
      },
    });

    let result: ResolvedPermissions;

    // ✅ SISTEMA PROFISSIONAL: Usuário sem perfil = sem permissões
    // Não há fallback baseado em role
    if (!assignments.length) {
      this.logger.warn(
        `Usuário ${userId} na empresa ${companyId} não possui perfil atribuído. Permissões vazias.`
      );
      result = this.getEmptyPermissions();
    } else {
      const allPermissions: ResolvedPermissions['permissions'] = [];
      const processTypePermissions: ProfileProcessTypeInput[] = [];
      const profileIds: string[] = [];

      // Resolve permissões de cada perfil com hierarquia
      for (const assignment of assignments) {
        profileIds.push(assignment.profileId);
        const resolved = await this.resolveProfileHierarchy(assignment.profileId);
        allPermissions.push(...resolved.permissions);
        processTypePermissions.push(...resolved.processTypes);
      }

      result = {
        profileIds,
        permissions: this.mergePermissions(allPermissions).map((permission) => ({
          resource: permission.resource,
          action: permission.action,
          scope: this.normalizeScope(permission.scope),
        })),
        processTypes: this.mergeProcessTypePermissions(processTypePermissions).map((permission) => ({
          ...permission,
        })),
      };
    }

    // Armazena no cache
    await this.cacheService.set(cacheKey, result);

    return result;
  }
}
