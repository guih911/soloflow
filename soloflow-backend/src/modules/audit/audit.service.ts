import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogFilters {
  userId?: string;
  companyId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditLogCreateData {
  userId?: string;
  companyId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra uma ação no log de auditoria
   */
  async logAction(data: AuditLogCreateData) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          userId: data.userId,
          companyId: data.companyId,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging shouldn't break application flow
      this.logger.error('Erro ao registrar log de auditoria', error.stack);
      return null;
    }
  }

  /**
   * Busca logs de auditoria com filtros e paginação
   */
  async getAuditLogs(filters: AuditLogFilters = {}) {
    const {
      userId,
      companyId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (companyId) where.companyId = companyId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca logs de auditoria de um usuário específico
   */
  async getAuditLogsByUser(userId: string, page = 1, limit = 50) {
    return this.getAuditLogs({ userId, page, limit });
  }

  /**
   * Busca logs de auditoria de uma empresa específica
   */
  async getAuditLogsByCompany(companyId: string, page = 1, limit = 50) {
    return this.getAuditLogs({ companyId, page, limit });
  }

  /**
   * Busca logs de auditoria de um recurso específico
   */
  async getAuditLogsByResource(
    resource: string,
    resourceId: string,
    page = 1,
    limit = 50,
  ) {
    return this.getAuditLogs({ resource, resourceId, page, limit });
  }

  /**
   * Busca logs de auditoria por ação
   */
  async getAuditLogsByAction(action: string, page = 1, limit = 50) {
    return this.getAuditLogs({ action, page, limit });
  }

  /**
   * Estatísticas de auditoria
   */
  async getAuditStats(filters: {
    userId?: string;
    companyId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.companyId) where.companyId = filters.companyId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    // Total de ações
    const total = await this.prisma.auditLog.count({ where });

    // Ações por tipo
    const actionCounts = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: 'desc',
        },
      },
    });

    // Recursos mais acessados
    const resourceCounts = await this.prisma.auditLog.groupBy({
      by: ['resource'],
      where,
      _count: {
        resource: true,
      },
      orderBy: {
        _count: {
          resource: 'desc',
        },
      },
    });

    return {
      total,
      byAction: actionCounts.map((item) => ({
        action: item.action,
        count: item._count.action,
      })),
      byResource: resourceCounts.map((item) => ({
        resource: item.resource,
        count: item._count.resource,
      })),
    };
  }
}
