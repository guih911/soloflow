import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  StreamableFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CheckScope } from '../auth/decorators/check-scope.decorator';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';
import { ReportFiltersDto, ReportType } from './dto/report-filters.dto';
import { ProfilesService } from '../profiles/profiles.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, ScopeGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsPdfService: ReportsPdfService,
    private readonly profilesService: ProfilesService,
  ) {}

  // Lista de tipos de relatório
  private readonly reportTypes = ['dashboard', 'performance', 'processes', 'tasks', 'sectors', 'audit'];

  /**
   * Verifica se o usuário tem acesso a um tipo específico de relatório
   */
  private async canAccessReportType(req: any, reportType: string): Promise<boolean> {
    const permissions = await this.profilesService.resolveUserPermissions(
      req.user.id,
      req.user.companyId,
    );

    // Se tem manage, pode acessar tudo
    const hasManage = permissions.permissions.some(
      (p) =>
        (p.resource === '*' && p.action === '*') ||
        (p.resource === 'reports' && p.action === 'manage'),
    );
    if (hasManage) return true;

    // Se tem a permissão específica view_<reportType>
    const hasSpecificPermission = permissions.permissions.some(
      (p) => p.resource === 'reports' && p.action === `view_${reportType}`,
    );
    if (hasSpecificPermission) return true;

    // Verificar se existem permissões específicas configuradas
    const hasAnySpecificPermission = permissions.permissions.some(
      (p) => p.resource === 'reports' && this.reportTypes.some(rt => p.action === `view_${rt}`),
    );

    // Se não tem nenhuma permissão específica, mas tem view genérico, permite (compatibilidade)
    if (!hasAnySpecificPermission) {
      const hasGenericView = permissions.permissions.some(
        (p) => p.resource === 'reports' && p.action === 'view',
      );
      if (hasGenericView) return true;
    }

    return false;
  }

  private async checkReportAccess(req: any, reportType: string): Promise<void> {
    const canAccess = await this.canAccessReportType(req, reportType);
    if (!canAccess) {
      throw new ForbiddenException(`Você não tem permissão para acessar o relatório de ${reportType}`);
    }
  }

  private async resolveSectorFilter(req: any, filters: ReportFiltersDto): Promise<string | undefined> {
    const permissions = await this.profilesService.resolveUserPermissions(
      req.user.id,
      req.user.companyId,
    );

    const hasManage = permissions.permissions.some(
      (p) =>
        (p.resource === '*' && p.action === '*') ||
        (p.resource === 'reports' && p.action === 'manage'),
    );

    if (hasManage) {
      // Gestor pode filtrar por setor, ou ver tudo se não filtrar
      return filters.sectorId || undefined;
    }

    // Usuário comum vê apenas seu setor
    return req.user.sectorId || undefined;
  }

  @Get('dashboard')
  @CheckScope({ resource: 'reports', action: 'view' })
  async getDashboard(@Req() req, @Query() filters: ReportFiltersDto) {
    await this.checkReportAccess(req, 'dashboard');
    const sectorId = await this.resolveSectorFilter(req, filters);
    return this.reportsService.getDashboardData(req.user.companyId, sectorId);
  }

  @Get('processes')
  @CheckScope({ resource: 'reports', action: 'view' })
  async getProcessesReport(@Req() req, @Query() filters: ReportFiltersDto) {
    await this.checkReportAccess(req, 'processes');
    const sectorId = await this.resolveSectorFilter(req, filters);
    return this.reportsService.getProcessesReport(req.user.companyId, filters, sectorId);
  }

  @Get('tasks')
  @CheckScope({ resource: 'reports', action: 'view' })
  async getTasksReport(@Req() req, @Query() filters: ReportFiltersDto) {
    await this.checkReportAccess(req, 'tasks');
    const sectorId = await this.resolveSectorFilter(req, filters);
    return this.reportsService.getTasksReport(req.user.companyId, filters, sectorId);
  }

  @Get('audit')
  @CheckScope({ resource: 'reports', action: 'view' })
  async getAuditReport(@Req() req, @Query() filters: ReportFiltersDto) {
    await this.checkReportAccess(req, 'audit');
    const sectorId = await this.resolveSectorFilter(req, filters);
    return this.reportsService.getAuditReport(req.user.companyId, filters, sectorId);
  }

  @Get('sectors')
  @CheckScope({ resource: 'reports', action: 'view' })
  async getSectorsReport(@Req() req, @Query() filters: ReportFiltersDto) {
    await this.checkReportAccess(req, 'sectors');
    const sectorId = await this.resolveSectorFilter(req, filters);
    return this.reportsService.getSectorsReport(req.user.companyId, sectorId);
  }

  @Get('performance')
  @CheckScope({ resource: 'reports', action: 'view' })
  async getPerformance(@Req() req, @Query() filters: ReportFiltersDto) {
    await this.checkReportAccess(req, 'performance');
    const sectorId = await this.resolveSectorFilter(req, filters);
    return this.reportsService.getPerformanceData(req.user.companyId, sectorId);
  }

  @Get('export/:type')
  @CheckScope({ resource: 'reports', action: 'export' })
  async exportPdf(
    @Param('type') type: string,
    @Query() filters: ReportFiltersDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const sectorId = await this.resolveSectorFilter(req, filters);
    const companyId = req.user.companyId;

    let title: string;
    let headers: string[];
    let rows: string[][];

    switch (type) {
      case ReportType.DASHBOARD: {
        title = 'Relatorio - Visao Geral';
        headers = ['Indicador', 'Valor'];
        const dashboard = await this.reportsService.getDashboardData(companyId, sectorId);
        rows = [
          ['Total de Processos', String(dashboard.cards.total)],
          ['Em Andamento', String(dashboard.cards.inProgress)],
          ['Concluidos', String(dashboard.cards.completed)],
          ['Cancelados', String(dashboard.cards.cancelled)],
          ['Taxa de Conclusao', `${dashboard.cards.completionRate}%`],
          ['Tempo Medio de Conclusao', `${dashboard.cards.avgCompletionHours}h`],
          ['Tarefas Pendentes', String(dashboard.cards.pendingTasks)],
          ['Novos (ultimos 30 dias)', String(dashboard.cards.newProcesses30d)],
        ];
        break;
      }
      case ReportType.PERFORMANCE: {
        title = 'Relatorio de Performance';
        headers = ['Colaborador', 'Pendentes', 'Em Andamento', 'Concluidas', 'Taxa (%)'];
        const performance = await this.reportsService.getPerformanceData(companyId, sectorId);
        rows = (performance.efficiency || []).map((e: any) => [
          e.name || '',
          String(performance.workload?.find((w: any) => w.userId === e.userId)?.pending || 0),
          String(performance.workload?.find((w: any) => w.userId === e.userId)?.inProgress || 0),
          String(performance.workload?.find((w: any) => w.userId === e.userId)?.completed || 0),
          `${e.completionRate}%`,
        ]);
        break;
      }
      case ReportType.PROCESSES: {
        title = 'Relatorio de Processos';
        headers = ['Codigo', 'Tipo', 'Status', 'Criado por', 'Data'];
        const result = await this.reportsService.getProcessesReport(companyId, filters, sectorId);
        rows = result.data.map((p: any) => [
          p.code || '',
          p.processTypeVersion?.processType?.name || '',
          this.translateStatus(p.status),
          p.createdBy?.name || '',
          new Date(p.createdAt).toLocaleDateString('pt-BR'),
        ]);
        break;
      }
      case ReportType.TASKS: {
        title = 'Relatorio de Tarefas';
        headers = ['Processo', 'Etapa', 'Responsavel', 'Status', 'Data'];
        const result = await this.reportsService.getTasksReport(companyId, filters, sectorId);
        rows = result.data.map((t: any) => [
          t.processInstance?.code || '',
          t.stepVersion?.name || '',
          t.executor?.name || '',
          this.translateStatus(t.status),
          new Date(t.createdAt).toLocaleDateString('pt-BR'),
        ]);
        break;
      }
      case ReportType.AUDIT: {
        title = 'Relatorio de Auditoria';
        headers = ['Data', 'Usuario', 'Acao', 'Recurso', 'Detalhes'];
        const result = await this.reportsService.getAuditReport(companyId, filters, sectorId);
        rows = result.data.map((l) => [
          new Date(l.createdAt).toLocaleDateString('pt-BR'),
          l.user?.name || '',
          l.action || '',
          l.resource || '',
          typeof l.details === 'object' ? JSON.stringify(l.details).slice(0, 50) : String(l.details || ''),
        ]);
        break;
      }
      case ReportType.SECTORS: {
        title = 'Relatorio por Setor';
        headers = ['Setor', 'Total Tarefas', 'Concluidas', 'Pendentes', 'Taxa (%)'];
        const result = await this.reportsService.getSectorsReport(companyId, sectorId);
        rows = result.data.map((s) => [
          s.sectorName,
          String(s.totalTasks),
          String(s.completedTasks),
          String(s.pendingTasks),
          `${s.completionRate}%`,
        ]);
        break;
      }
      default:
        throw new BadRequestException(`Tipo de relatório inválido: ${type}`);
    }

    const pdfBuffer = await this.reportsPdfService.generateReport({
      title,
      subtitle: this.buildSubtitle(filters),
      headers,
      rows,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-${type.toLowerCase()}-${Date.now()}.pdf"`,
    });

    return new StreamableFile(pdfBuffer);
  }

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      IN_PROGRESS: 'Em Andamento',
      COMPLETED: 'Concluido',
      CANCELLED: 'Cancelado',
      REJECTED: 'Rejeitado',
      PENDING: 'Pendente',
      SIGNED: 'Assinado',
      DRAFT: 'Rascunho',
    };
    return map[status] || status || '';
  }

  private buildSubtitle(filters: ReportFiltersDto): string {
    const parts: string[] = [];
    if (filters.startDate) parts.push(`De: ${new Date(filters.startDate).toLocaleDateString('pt-BR')}`);
    if (filters.endDate) parts.push(`Ate: ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`);
    if (filters.status) parts.push(`Status: ${this.translateStatus(filters.status)}`);
    return parts.join(' | ') || '';
  }
}
