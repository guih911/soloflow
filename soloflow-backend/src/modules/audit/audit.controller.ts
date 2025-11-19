import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Listar logs de auditoria (ADMIN e MANAGER podem ver)
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAuditLogs(
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogs({
      userId,
      companyId,
      action,
      resource,
      resourceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Ver logs de auditoria de um usuário específico
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAuditLogsByUser(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogsByUser(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Ver logs de auditoria de uma empresa específica
   */
  @Get('company/:companyId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAuditLogsByCompany(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogsByCompany(
      companyId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Ver logs de auditoria de um recurso específico
   */
  @Get('resource/:resource/:resourceId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAuditLogsByResource(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogsByResource(
      resource,
      resourceId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Ver logs de auditoria por ação
   */
  @Get('action/:action')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAuditLogsByAction(
    @Param('action') action: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogsByAction(
      action,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * Obter estatísticas de auditoria
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getAuditStats(
    @Query('userId') userId?: string,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getAuditStats({
      userId,
      companyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Ver meus próprios logs de auditoria (qualquer usuário autenticado)
   */
  @Get('my-logs')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async getMyAuditLogs(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogsByUser(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
