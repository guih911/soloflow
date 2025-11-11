import { ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProfileDto, ProfilePermissionInput, ProfileProcessTypeInput } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
  constructor(private readonly prisma: PrismaService) {}

  private buildPermissionCreates(
    inputs?: ProfilePermissionInput[],
  ): Prisma.ProfilePermissionCreateWithoutProfileInput[] | undefined {
    if (!inputs?.length) {
      return undefined;
    }
    return inputs.map(
      (permission): Prisma.ProfilePermissionCreateWithoutProfileInput => ({
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope ? (permission.scope as Prisma.InputJsonValue) : Prisma.DbNull,
      }),
    );
  }

  private buildProcessTypeCreates(
    inputs?: ProfileProcessTypeInput[],
  ): Prisma.ProfileProcessTypeUncheckedCreateWithoutProfileInput[] | undefined {
    if (!inputs?.length) {
      return undefined;
    }
    return inputs.map((processType): Prisma.ProfileProcessTypeUncheckedCreateWithoutProfileInput => {
      const processTypeValue = typeof processType.processTypeId === 'object' && processType.processTypeId !== null
        ? (processType.processTypeId as any).id ?? (processType.processTypeId as any).value ?? '*'
        : processType.processTypeId;

      return {
        processTypeId: processTypeValue || '*',
        canView: processType.canView ?? true,
        canCreate: processType.canCreate ?? false,
        canExecute: processType.canExecute ?? false,
      };
    });
  }

  async create(companyId: string, dto: CreateProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      const permissionCreates = this.buildPermissionCreates(dto.permissions);
      const processTypeCreates = this.buildProcessTypeCreates(dto.processTypes);

      if (dto.isDefault) {
        await tx.profile.updateMany({
          where: {
            companyId,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const created = await tx.profile.create({
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          companyId,
          permissions: permissionCreates?.length
            ? {
                create: permissionCreates,
              }
            : undefined,
          processTypePermissions: processTypeCreates?.length
            ? {
                create: processTypeCreates,
              }
            : undefined,
        },
        include: {
          permissions: true,
          processTypePermissions: true,
        },
      });

      return created;
    });
  }

  async ensureProfileInCompany(profileId: string, companyId: string | null) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        company: true,
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
    return this.prisma.profile.findMany({
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
        permissions: true,
        processTypePermissions: {
          include: {
            processType: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        id,
        OR: [
          { companyId: null },
          { companyId },
        ],
      },
      include: {
        permissions: true,
        processTypePermissions: {
          include: {
            processType: {
              select: { id: true, name: true },
            },
          },
        },
        assignments: {
          include: {
            user: {
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

  async update(id: string, companyId: string, dto: UpdateProfileDto) {
    await this.ensureProfileInCompany(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.profile.updateMany({
          where: {
            companyId,
            NOT: { id },
          },
          data: { isDefault: false },
        });
      }

      const updated = await tx.profile.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          isDefault: dto.isDefault,
        },
      });

      if (dto.permissions) {
        await tx.profilePermission.deleteMany({
          where: { profileId: id },
        });

        if (dto.permissions.length) {
          const permissionCreates = this.buildPermissionCreates(dto.permissions);
          if (permissionCreates?.length) {
            await tx.profilePermission.createMany({
              data: permissionCreates.map((permission) => ({
                ...permission,
                profileId: id,
              })),
            });
          }
        }
      }

      if (dto.processTypes) {
        await tx.profileProcessType.deleteMany({
          where: { profileId: id },
        });

        if (dto.processTypes.length) {
          const processTypeCreates = this.buildProcessTypeCreates(dto.processTypes);
          if (processTypeCreates?.length) {
            await tx.profileProcessType.createMany({
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
  }

  async remove(id: string, companyId: string) {
    const profile = await this.ensureProfileInCompany(id, companyId);

    const assignments = await this.prisma.userProfile.count({
      where: { profileId: id },
    });

    if (assignments > 0) {
      throw new ConflictException('Não é possível remover um perfil que possui usuários vinculados');
    }

    return this.prisma.profile.delete({
      where: { id: profile.id },
    });
  }

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

    return this.prisma.userProfile.upsert({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      create: {
        userId,
        companyId,
        profileId,
        assignedBy,
      },
      update: {
        profileId,
        assignedBy,
      },
      include: {
        profile: {
          include: {
            permissions: true,
            processTypePermissions: true,
          },
        },
      },
    });
  }

  async removeAssignment(userId: string, companyId: string) {
    return this.prisma.userProfile.delete({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
  }

  async listAssignments(profileId: string, companyId: string) {
    await this.ensureProfileInCompany(profileId, companyId);

    return this.prisma.userProfile.findMany({
      where: {
        profileId,
        companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

  private getFallbackByRole(role: UserRole): ResolvedPermissions {
    const defaultPermissions = {
      profileIds: [],
      permissions: [] as ResolvedPermissions['permissions'],
      processTypes: [] as ResolvedPermissions['processTypes'],
    };

    switch (role) {
      case UserRole.ADMIN:
        defaultPermissions.permissions.push({ resource: '*', action: '*', scope: null });
        defaultPermissions.processTypes.push({
          processTypeId: '*',
          canView: true,
          canCreate: true,
          canExecute: true,
        });
        break;
      case UserRole.MANAGER:
        defaultPermissions.permissions.push({ resource: 'dashboard', action: 'view', scope: null });
        defaultPermissions.permissions.push({ resource: 'processes', action: 'manage', scope: null });
        defaultPermissions.permissions.push({ resource: 'profiles', action: 'manage', scope: null });
        defaultPermissions.processTypes.push({
          processTypeId: '*',
          canView: true,
          canCreate: true,
          canExecute: true,
        });
        break;
      default:
        defaultPermissions.permissions.push({ resource: 'dashboard', action: 'view', scope: null });
        defaultPermissions.permissions.push({ resource: 'tasks', action: 'execute', scope: null });
        defaultPermissions.permissions.push({ resource: 'processes', action: 'create', scope: null });
        defaultPermissions.processTypes.push({
          processTypeId: '*',
          canView: true,
          canCreate: true,
          canExecute: false,
        });
        break;
    }

    return defaultPermissions;
  }

  async resolveUserPermissions(userId: string, companyId: string, fallbackRole: UserRole): Promise<ResolvedPermissions> {
    const assignments = await this.prisma.userProfile.findMany({
      where: {
        userId,
        companyId,
      },
      include: {
        profile: {
          include: {
            permissions: true,
            processTypePermissions: true,
          },
        },
      },
    });

    if (!assignments.length) {
      return this.getFallbackByRole(fallbackRole);
    }

    const allPermissions: ResolvedPermissions['permissions'] = [];
    const processTypePermissions: ProfileProcessTypeInput[] = [];

    assignments.forEach((assignment) => {
      assignment.profile.permissions.forEach((permission) => {
        allPermissions.push({
          resource: permission.resource,
          action: permission.action,
          scope: this.normalizeScope(permission.scope),
        });
      });

      assignment.profile.processTypePermissions.forEach((processPermission) => {
        processTypePermissions.push({
          processTypeId: processPermission.processTypeId,
          canView: processPermission.canView,
          canCreate: processPermission.canCreate,
          canExecute: processPermission.canExecute,
        });
      });
    });

    return {
      profileIds: assignments.map((assignment) => assignment.profileId),
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
}
