import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(companyId: string, sectorId?: string) {
    const baseWhere: any = { companyId };
    if (sectorId) {
      baseWhere.stepExecutions = { some: { sectorId } };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Contagens gerais
    const [total, inProgress, completed, cancelled] = await Promise.all([
      this.prisma.processInstance.count({ where: baseWhere }),
      this.prisma.processInstance.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
      this.prisma.processInstance.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
      this.prisma.processInstance.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    ]);

    // Período atual vs anterior (30 dias) para trends
    const [currentPeriod, previousPeriod] = await Promise.all([
      this.prisma.processInstance.count({
        where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.processInstance.count({
        where: { ...baseWhere, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const [completedCurrent, completedPrevious] = await Promise.all([
      this.prisma.processInstance.count({
        where: { ...baseWhere, status: 'COMPLETED', updatedAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.processInstance.count({
        where: { ...baseWhere, status: 'COMPLETED', updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    // Taxa de conclusão
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tempo médio de conclusão (processos concluídos)
    const completedProcesses = await this.prisma.processInstance.findMany({
      where: { ...baseWhere, status: 'COMPLETED', completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
      take: 200,
      orderBy: { completedAt: 'desc' },
    });

    let avgCompletionHours = 0;
    if (completedProcesses.length > 0) {
      const totalHours = completedProcesses.reduce((sum, p) => {
        if (p.completedAt) {
          return sum + (new Date(p.completedAt).getTime() - new Date(p.createdAt).getTime()) / 3600000;
        }
        return sum;
      }, 0);
      avgCompletionHours = Math.round(totalHours / completedProcesses.length);
    }

    // Tarefas pendentes (gargalos)
    const pendingTasks = await this.prisma.stepExecution.count({
      where: {
        processInstance: { companyId, ...(sectorId ? { stepExecutions: { some: { sectorId } } } : {}) },
        status: 'PENDING',
      },
    });

    // Processos por mês (6 meses)
    const processesByMonth = await this.prisma.processInstance.groupBy({
      by: ['createdAt'],
      where: { ...baseWhere, createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    // Concluídos por mês (6 meses)
    const completedByMonth = await this.prisma.processInstance.groupBy({
      by: ['completedAt'],
      where: { ...baseWhere, status: 'COMPLETED', completedAt: { gte: sixMonthsAgo, not: null } },
      _count: { id: true },
    });

    // Processos por status
    const byStatus = await this.prisma.processInstance.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });

    // Volume por setor
    const bySector = await this.prisma.stepExecution.groupBy({
      by: ['sectorId'],
      where: {
        processInstance: { companyId },
        sectorId: { not: null },
      },
      _count: { id: true },
    });

    const sectorIds = bySector.map(s => s.sectorId).filter(Boolean);
    const sectors = sectorIds.length > 0
      ? await this.prisma.sector.findMany({
          where: { id: { in: sectorIds as string[] } },
          select: { id: true, name: true },
        })
      : [];
    const sectorMap = new Map(sectors.map(s => [s.id, s.name]));

    // Top 5 tipos de processo mais usados
    const topProcessTypes = await this.prisma.processInstance.groupBy({
      by: ['processTypeVersionId'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const ptVersionIds = topProcessTypes.map(t => t.processTypeVersionId).filter(Boolean);
    const ptVersions = ptVersionIds.length > 0
      ? await this.prisma.processTypeVersion.findMany({
          where: { id: { in: ptVersionIds as string[] } },
          select: { id: true, processType: { select: { name: true } } },
        })
      : [];
    const ptMap = new Map(ptVersions.map(v => [v.id, v.processType?.name || 'Sem nome']));

    // Top 5 executores (por tarefas concluídas nos últimos 30 dias)
    const topExecutors = await this.prisma.stepExecution.groupBy({
      by: ['executorId'],
      where: {
        processInstance: { companyId },
        status: 'COMPLETED',
        completedAt: { gte: thirtyDaysAgo },
        executorId: { not: null },
        ...(sectorId ? { sectorId } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const executorIds = topExecutors.map(e => e.executorId).filter(Boolean);
    const executors = executorIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: executorIds as string[] } },
          select: { id: true, name: true },
        })
      : [];
    const executorMap = new Map(executors.map(u => [u.id, u.name]));

    return {
      cards: {
        total,
        inProgress,
        completed,
        cancelled,
        completionRate,
        avgCompletionHours,
        pendingTasks,
        newProcesses30d: currentPeriod,
      },
      trends: {
        processes: this.calcTrend(currentPeriod, previousPeriod),
        completed: this.calcTrend(completedCurrent, completedPrevious),
      },
      processesByMonth: this.groupByMonth(processesByMonth),
      completedByMonth: this.groupByMonthField(completedByMonth, 'completedAt'),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
      bySector: bySector
        .map(s => ({
          sectorId: s.sectorId,
          sectorName: sectorMap.get(s.sectorId!) || 'Sem setor',
          count: s._count.id,
        }))
        .sort((a, b) => b.count - a.count),
      topProcessTypes: topProcessTypes.map(t => ({
        name: ptMap.get(t.processTypeVersionId!) || 'Sem tipo',
        count: t._count.id,
      })),
      topExecutors: topExecutors.map(e => ({
        userId: e.executorId,
        name: executorMap.get(e.executorId!) || 'Desconhecido',
        count: e._count.id,
      })),
    };
  }

  async getProcessesReport(companyId: string, filters: ReportFiltersDto, sectorId?: string) {
    const where: any = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }
    if (sectorId) {
      where.stepExecutions = { some: { sectorId } };
    }

    const [processes, total] = await Promise.all([
      this.prisma.processInstance.findMany({
        where,
        include: {
          processTypeVersion: {
            select: { id: true, processType: { select: { id: true, name: true } } },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.processInstance.count({ where }),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const timelineRaw = await this.prisma.processInstance.groupBy({
      by: ['createdAt'],
      where: { ...where, createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    // Agrupamento por tipo de processo
    const byType = await this.prisma.processInstance.groupBy({
      by: ['processTypeVersionId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const versionIds = byType.map(t => t.processTypeVersionId).filter(Boolean);
    const versions = versionIds.length > 0
      ? await this.prisma.processTypeVersion.findMany({
          where: { id: { in: versionIds as string[] } },
          select: { id: true, processType: { select: { name: true } } },
        })
      : [];
    const versionMap = new Map(versions.map(v => [v.id, v.processType?.name || 'Sem tipo']));

    return {
      data: processes,
      total,
      timeline: this.groupByMonth(timelineRaw),
      byType: byType.map(t => ({
        name: versionMap.get(t.processTypeVersionId!) || 'Sem tipo',
        count: t._count.id,
      })),
    };
  }

  async getTasksReport(companyId: string, filters: ReportFiltersDto, sectorId?: string) {
    const where: any = {
      processInstance: { companyId },
    };

    if (filters.status) where.status = filters.status;
    if (filters.userId) where.executorId = filters.userId;
    if (sectorId) where.sectorId = sectorId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [tasks, total] = await Promise.all([
      this.prisma.stepExecution.findMany({
        where,
        include: {
          stepVersion: { select: { name: true, type: true } },
          executor: { select: { id: true, name: true } },
          processInstance: { select: { code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.stepExecution.count({ where }),
    ]);

    // Tarefas por executor
    const byExecutor = await this.prisma.stepExecution.groupBy({
      by: ['executorId'],
      where: { ...where, executorId: { not: null } },
      _count: { id: true },
    });

    const userIds = byExecutor.map(e => e.executorId).filter(Boolean);
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds as string[] } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // Tarefas por status
    const byStatus = await this.prisma.stepExecution.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    // Tempo médio de execução por executor
    const completedTasks = await this.prisma.stepExecution.findMany({
      where: { ...where, status: 'COMPLETED', completedAt: { not: null } },
      select: { executorId: true, createdAt: true, completedAt: true },
      take: 500,
    });

    const avgTimeByExecutor = new Map<string, { total: number; count: number }>();
    for (const task of completedTasks) {
      if (task.executorId && task.completedAt) {
        const hours = (new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / 3600000;
        const existing = avgTimeByExecutor.get(task.executorId) || { total: 0, count: 0 };
        existing.total += hours;
        existing.count += 1;
        avgTimeByExecutor.set(task.executorId, existing);
      }
    }

    return {
      data: tasks.map(t => ({
        ...t,
        executionTime: t.completedAt && t.createdAt
          ? Math.round((new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000)
          : null,
      })),
      total,
      byExecutor: byExecutor.map(e => ({
        userId: e.executorId,
        userName: userMap.get(e.executorId!) || 'Sem responsável',
        count: e._count.id,
        avgHours: avgTimeByExecutor.has(e.executorId!)
          ? Math.round(avgTimeByExecutor.get(e.executorId!)!.total / avgTimeByExecutor.get(e.executorId!)!.count)
          : null,
      })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
    };
  }

  async getAuditReport(companyId: string, filters: ReportFiltersDto, sectorId?: string) {
    const where: any = { companyId };

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.action = filters.status;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Contagem por ação
    const byAction = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return {
      data: logs,
      total,
      byAction: byAction.map(a => ({ action: a.action, count: a._count.id })),
    };
  }

  async getPerformanceData(companyId: string, sectorId?: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const stepWhere: any = { processInstance: { companyId } };
    if (sectorId) stepWhere.sectorId = sectorId;

    // 1. Bottlenecks — etapas mais lentas
    const slowSteps = await this.prisma.stepExecution.findMany({
      where: {
        ...stepWhere,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        createdAt: true,
        stepVersion: { select: { name: true } },
      },
      take: 500,
    });

    const stepGroups = new Map<string, { totalHours: number; count: number }>();
    for (const step of slowSteps) {
      const name = step.stepVersion?.name || 'Sem nome';
      const hours = (now.getTime() - new Date(step.createdAt).getTime()) / 3600000;
      const group = stepGroups.get(name) || { totalHours: 0, count: 0 };
      group.totalHours += hours;
      group.count += 1;
      stepGroups.set(name, group);
    }

    const totalStuck = slowSteps.length;
    const bottlenecks = Array.from(stepGroups.entries())
      .map(([name, data]) => ({
        name,
        avgHours: Math.round(data.totalHours / data.count),
        count: data.count,
        percentage: totalStuck > 0 ? Math.round((data.count / totalStuck) * 100) : 0,
      }))
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 10);

    // 2. Workload — carga por usuário
    const workloadSteps = await this.prisma.stepExecution.findMany({
      where: {
        ...stepWhere,
        executorId: { not: null },
        OR: [
          { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
        ],
      },
      select: {
        executorId: true,
        status: true,
      },
      take: 2000,
    });

    const workloadMap = new Map<string, { pending: number; inProgress: number; completed: number }>();
    for (const step of workloadSteps) {
      if (!step.executorId) continue;
      const entry = workloadMap.get(step.executorId) || { pending: 0, inProgress: 0, completed: 0 };
      if (step.status === 'PENDING') entry.pending++;
      else if (step.status === 'IN_PROGRESS') entry.inProgress++;
      else if (step.status === 'COMPLETED') entry.completed++;
      workloadMap.set(step.executorId, entry);
    }

    const workloadUserIds = Array.from(workloadMap.keys());
    const workloadUsers = workloadUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: workloadUserIds } },
          select: { id: true, name: true },
        })
      : [];
    const workloadUserMap = new Map(workloadUsers.map(u => [u.id, u.name]));

    const workload = Array.from(workloadMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: workloadUserMap.get(userId) || 'Desconhecido',
        pending: data.pending,
        inProgress: data.inProgress,
        completed: data.completed,
      }))
      .sort((a, b) => b.pending - a.pending);

    // 3. Stale Processes — processos parados há >3 dias
    const processWhere: any = { companyId, status: 'IN_PROGRESS', updatedAt: { lt: threeDaysAgo } };
    if (sectorId) {
      processWhere.stepExecutions = { some: { sectorId } };
    }

    const staleRaw = await this.prisma.processInstance.findMany({
      where: processWhere,
      select: {
        id: true,
        code: true,
        updatedAt: true,
        stepExecutions: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          select: {
            stepVersion: { select: { name: true } },
            executor: { select: { name: true } },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
    });

    const staleProcesses = staleRaw.map(p => {
      const daysStopped = Math.floor((now.getTime() - new Date(p.updatedAt).getTime()) / 86400000);
      const currentStep = p.stepExecutions[0];
      return {
        id: p.id,
        code: p.code,
        daysStopped,
        currentStep: currentStep?.stepVersion?.name || '-',
        responsible: currentStep?.executor?.name || '-',
      };
    });

    // 4. Efficiency — eficiência por colaborador (30 dias)
    const efficiencySteps = await this.prisma.stepExecution.findMany({
      where: {
        ...stepWhere,
        executorId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        executorId: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
      take: 2000,
    });

    const effMap = new Map<string, { totalResponseHours: number; completedCount: number; totalAssigned: number }>();
    for (const step of efficiencySteps) {
      if (!step.executorId) continue;
      const entry = effMap.get(step.executorId) || { totalResponseHours: 0, completedCount: 0, totalAssigned: 0 };
      entry.totalAssigned++;
      if (step.status === 'COMPLETED' && step.completedAt) {
        const hours = (new Date(step.completedAt).getTime() - new Date(step.createdAt).getTime()) / 3600000;
        entry.totalResponseHours += hours;
        entry.completedCount++;
      }
      effMap.set(step.executorId, entry);
    }

    const effUserIds = Array.from(effMap.keys());
    const effUsers = effUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: effUserIds } },
          select: { id: true, name: true },
        })
      : [];
    const effUserMap = new Map(effUsers.map(u => [u.id, u.name]));

    const efficiency = Array.from(effMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: effUserMap.get(userId) || 'Desconhecido',
        avgResponseHours: data.completedCount > 0 ? Math.round(data.totalResponseHours / data.completedCount) : null,
        completionRate: data.totalAssigned > 0 ? Math.round((data.completedCount / data.totalAssigned) * 100) : 0,
        total: data.totalAssigned,
      }))
      .sort((a, b) => b.completionRate - a.completionRate);

    return {
      bottlenecks,
      workload,
      staleProcesses,
      efficiency,
      summary: {
        staleCount: staleProcesses.length,
        bottleneckCount: bottlenecks.length,
        maxWorkloadUser: workload.length > 0 ? workload[0].name : '-',
        maxWorkloadPending: workload.length > 0 ? workload[0].pending : 0,
        avgEfficiency: efficiency.length > 0
          ? Math.round(efficiency.reduce((sum, e) => sum + e.completionRate, 0) / efficiency.length)
          : 0,
      },
    };
  }

  async getSectorsReport(companyId: string, sectorId?: string) {
    const sectorWhere: any = { companyId };
    if (sectorId) sectorWhere.id = sectorId;

    const sectors = await this.prisma.sector.findMany({
      where: sectorWhere,
      select: { id: true, name: true },
    });

    const sectorStats = await Promise.all(
      sectors.map(async (sector) => {
        const [totalTasks, completedTasks, pendingTasks, inProgressTasks] = await Promise.all([
          this.prisma.stepExecution.count({
            where: { sectorId: sector.id, processInstance: { companyId } },
          }),
          this.prisma.stepExecution.count({
            where: { sectorId: sector.id, status: 'COMPLETED', processInstance: { companyId } },
          }),
          this.prisma.stepExecution.count({
            where: { sectorId: sector.id, status: 'PENDING', processInstance: { companyId } },
          }),
          this.prisma.stepExecution.count({
            where: { sectorId: sector.id, status: 'IN_PROGRESS', processInstance: { companyId } },
          }),
        ]);

        // Tempo médio do setor
        const completedInSector = await this.prisma.stepExecution.findMany({
          where: { sectorId: sector.id, status: 'COMPLETED', completedAt: { not: null }, processInstance: { companyId } },
          select: { createdAt: true, completedAt: true },
          take: 100,
          orderBy: { completedAt: 'desc' },
        });

        let avgHours = 0;
        if (completedInSector.length > 0) {
          const totalHours = completedInSector.reduce((sum, t) => {
            return sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600000;
          }, 0);
          avgHours = Math.round(totalHours / completedInSector.length);
        }

        return {
          sectorId: sector.id,
          sectorName: sector.name,
          totalTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks,
          avgHours,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      }),
    );

    return { data: sectorStats.sort((a, b) => b.totalTasks - a.totalTasks) };
  }

  private calcTrend(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'stable' } {
    if (previous === 0) return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'stable' };
    const change = Math.round(((current - previous) / previous) * 100);
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  private groupByMonth(records: any[]): { month: string; count: number }[] {
    const monthMap = new Map<string, number>();

    for (const record of records) {
      const date = new Date(record.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + (record._count?.id || 1));
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }

  private groupByMonthField(records: any[], field: string): { month: string; count: number }[] {
    const monthMap = new Map<string, number>();

    for (const record of records) {
      const date = new Date(record[field]);
      if (isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + (record._count?.id || 1));
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }
}
