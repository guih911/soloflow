// src/modules/lgpd/lgpd.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Ip,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { LgpdService, LEGAL_DOCUMENT_VERSIONS } from './lgpd.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CheckScope } from '../auth/decorators/check-scope.decorator';
import { ConsentType } from '@prisma/client';

// DTOs
class RecordConsentDto {
  consentType: ConsentType;
  accepted: boolean;
}

class RecordMultipleConsentsDto {
  consents: RecordConsentDto[];
}

class RequestDeletionDto {
  reason?: string;
}

class ProcessDeletionDto {
  approve: boolean;
  rejectionReason?: string;
}

class RetentionPolicyDto {
  entityType: string;
  retentionDays: number;
  description?: string;
}

@Controller('lgpd')
export class LgpdController {
  constructor(private lgpdService: LgpdService) {}

  // ════════════════════════════════════════════════════════════════════════════════
  // DOCUMENTOS LEGAIS (PÚBLICO)
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Obtém as versões atuais dos documentos legais
   */
  @Get('documents/versions')
  getDocumentVersions() {
    return {
      versions: LEGAL_DOCUMENT_VERSIONS,
      updatedAt: new Date().toISOString(),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // CONSENTIMENTO (AUTENTICADO)
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Obtém o status de consentimento do usuário logado
   */
  @Get('consent/status')
  @UseGuards(JwtAuthGuard)
  async getConsentStatus(@Request() req) {
    return this.lgpdService.getConsentStatus(req.user.id);
  }

  /**
   * Verifica se o usuário tem os consentimentos obrigatórios
   */
  @Get('consent/required')
  @UseGuards(JwtAuthGuard)
  async hasRequiredConsents(@Request() req) {
    const hasRequired = await this.lgpdService.hasRequiredConsents(req.user.id);
    return { hasRequiredConsents: hasRequired };
  }

  /**
   * Registra um consentimento
   */
  @Post('consent')
  @UseGuards(JwtAuthGuard)
  async recordConsent(
    @Request() req,
    @Body() dto: RecordConsentDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.lgpdService.recordConsent(req.user.id, {
      ...dto,
      ipAddress: ip,
      userAgent,
    });
  }

  /**
   * Registra múltiplos consentimentos de uma vez
   */
  @Post('consent/batch')
  @UseGuards(JwtAuthGuard)
  async recordMultipleConsents(
    @Request() req,
    @Body() dto: RecordMultipleConsentsDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const consentsWithContext = dto.consents.map((c) => ({
      ...c,
      ipAddress: ip,
      userAgent,
    }));
    return this.lgpdService.recordMultipleConsents(req.user.id, consentsWithContext);
  }

  /**
   * Revoga um consentimento específico (apenas não obrigatórios)
   */
  @Post('consent/revoke/:type')
  @UseGuards(JwtAuthGuard)
  async revokeConsent(
    @Request() req,
    @Param('type') type: ConsentType,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.lgpdService.revokeConsent(req.user.id, type, ip, userAgent);
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // EXCLUSÃO DE DADOS (AUTENTICADO)
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Solicita exclusão dos próprios dados
   */
  @Post('deletion/request')
  @UseGuards(JwtAuthGuard)
  async requestDeletion(
    @Request() req,
    @Body() dto: RequestDeletionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.lgpdService.requestDataDeletion(
      req.user.id,
      dto.reason,
      ip,
      userAgent,
    );
  }

  /**
   * Obtém o status da solicitação de exclusão do usuário
   */
  @Get('deletion/status')
  @UseGuards(JwtAuthGuard)
  async getDeletionStatus(@Request() req) {
    return this.lgpdService.getMyDeletionRequestStatus(req.user.id);
  }

  /**
   * Lista solicitações de exclusão (admin)
   */
  @Get('deletion/requests')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @CheckScope({ resource: 'lgpd', action: 'manage' })
  async listDeletionRequests(@Request() req, @Query('status') status?: string) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem acessar este recurso');
    }
    return this.lgpdService.listDeletionRequests(status);
  }

  /**
   * Processa uma solicitação de exclusão (admin)
   */
  @Patch('deletion/process/:id')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @CheckScope({ resource: 'lgpd', action: 'manage' })
  async processDeletion(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ProcessDeletionDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem processar solicitações de exclusão');
    }
    return this.lgpdService.processDataDeletion(
      id,
      req.user.id,
      dto.approve,
      dto.rejectionReason,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // POLÍTICA DE RETENÇÃO (ADMIN)
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Obtém as políticas de retenção de dados
   */
  @Get('retention/policies')
  @UseGuards(JwtAuthGuard)
  async getRetentionPolicies() {
    return this.lgpdService.getRetentionPolicies();
  }

  /**
   * Cria ou atualiza uma política de retenção (admin)
   */
  @Post('retention/policy')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @CheckScope({ resource: 'lgpd', action: 'manage' })
  async upsertRetentionPolicy(@Request() req, @Body() dto: RetentionPolicyDto) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem gerenciar políticas de retenção');
    }
    return this.lgpdService.upsertRetentionPolicy(
      dto.entityType,
      dto.retentionDays,
      dto.description,
    );
  }

  /**
   * Executa a limpeza de dados baseada nas políticas (admin/cron)
   */
  @Post('retention/execute')
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @CheckScope({ resource: 'lgpd', action: 'manage' })
  async executeRetention(@Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores podem executar limpeza de dados');
    }
    return this.lgpdService.executeDataRetention();
  }
}
