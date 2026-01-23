// src/modules/lgpd/lgpd.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { ConsentType } from '@prisma/client';

// Versões atuais dos documentos legais
export const LEGAL_DOCUMENT_VERSIONS = {
  PRIVACY_POLICY: '1.0',
  TERMS_OF_USE: '1.0',
  DATA_PROCESSING: '1.0',
  MARKETING: '1.0',
  COOKIES: '1.0',
};

export interface ConsentInput {
  consentType: ConsentType;
  accepted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentStatus {
  consentType: ConsentType;
  accepted: boolean;
  version: string;
  acceptedAt: Date | null;
  isCurrentVersion: boolean;
}

@Injectable()
export class LgpdService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  // ════════════════════════════════════════════════════════════════════════════════
  // CONSENTIMENTO
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Registra ou atualiza o consentimento do usuário
   */
  async recordConsent(userId: string, consent: ConsentInput): Promise<any> {
    const version = LEGAL_DOCUMENT_VERSIONS[consent.consentType] || '1.0';

    const existingConsent = await this.prisma.userConsent.findUnique({
      where: {
        userId_consentType: {
          userId,
          consentType: consent.consentType,
        },
      },
    });

    if (existingConsent) {
      // Atualiza consentimento existente
      return this.prisma.userConsent.update({
        where: { id: existingConsent.id },
        data: {
          accepted: consent.accepted,
          version,
          acceptedAt: consent.accepted ? new Date() : null,
          revokedAt: !consent.accepted ? new Date() : null,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
        },
      });
    }

    // Cria novo consentimento
    return this.prisma.userConsent.create({
      data: {
        userId,
        consentType: consent.consentType,
        accepted: consent.accepted,
        version,
        acceptedAt: consent.accepted ? new Date() : null,
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
      },
    });
  }

  /**
   * Registra múltiplos consentimentos de uma vez
   */
  async recordMultipleConsents(
    userId: string,
    consents: ConsentInput[],
  ): Promise<any[]> {
    const results: any[] = [];
    for (const consent of consents) {
      const result = await this.recordConsent(userId, consent);
      results.push(result);
    }
    return results;
  }

  /**
   * Verifica se o usuário deu todos os consentimentos obrigatórios
   */
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const requiredTypes: ConsentType[] = ['PRIVACY_POLICY', 'TERMS_OF_USE'];

    const consents = await this.prisma.userConsent.findMany({
      where: {
        userId,
        consentType: { in: requiredTypes },
        accepted: true,
      },
    });

    return consents.length === requiredTypes.length;
  }

  /**
   * Obtém o status de todos os consentimentos do usuário
   */
  async getConsentStatus(userId: string): Promise<ConsentStatus[]> {
    const allTypes = Object.keys(ConsentType) as ConsentType[];

    const consents = await this.prisma.userConsent.findMany({
      where: { userId },
    });

    return allTypes.map((type) => {
      const consent = consents.find((c) => c.consentType === type);
      const currentVersion = LEGAL_DOCUMENT_VERSIONS[type] || '1.0';

      return {
        consentType: type,
        accepted: consent?.accepted || false,
        version: consent?.version || currentVersion,
        acceptedAt: consent?.acceptedAt || null,
        isCurrentVersion: consent?.version === currentVersion,
      };
    });
  }

  /**
   * Revoga um consentimento específico
   */
  async revokeConsent(
    userId: string,
    consentType: ConsentType,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    // Não permite revogar consentimentos obrigatórios
    const mandatoryTypes: ConsentType[] = ['PRIVACY_POLICY', 'TERMS_OF_USE'];
    if (mandatoryTypes.includes(consentType)) {
      throw new BadRequestException(
        'Não é possível revogar consentimentos obrigatórios. Para isso, exclua sua conta.',
      );
    }

    return this.recordConsent(userId, {
      consentType,
      accepted: false,
      ipAddress,
      userAgent,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // EXCLUSÃO DE DADOS (DIREITO AO ESQUECIMENTO)
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Cria uma solicitação de exclusão de dados
   */
  async requestDataDeletion(
    userId: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    // Verifica se já existe uma solicitação pendente
    const existingRequest = await this.prisma.dataDeletionRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Já existe uma solicitação de exclusão em andamento.',
      );
    }

    return this.prisma.dataDeletionRequest.create({
      data: {
        userId,
        reason,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Processa a exclusão de dados do usuário (HARD DELETE)
   */
  async processDataDeletion(
    requestId: string,
    processedBy: string,
    approve: boolean,
    rejectionReason?: string,
  ): Promise<any> {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitação já foi processada.');
    }

    if (!approve) {
      return this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processedBy,
          rejectionReason,
        },
      });
    }

    // Executa a exclusão em transação
    const deletedData = await this.prisma.$transaction(async (tx) => {
      const userId = request.userId;
      const summary: any = {};

      // 1. Excluir consentimentos
      const consentsDeleted = await tx.userConsent.deleteMany({
        where: { userId },
      });
      summary.consents = consentsDeleted.count;

      // 2. Excluir refresh tokens
      const tokensDeleted = await tx.refreshToken.deleteMany({
        where: { userId },
      });
      summary.refreshTokens = tokensDeleted.count;

      // 3. Excluir perfis de usuário
      const profilesDeleted = await tx.user_profiles.deleteMany({
        where: { userId },
      });
      summary.userProfiles = profilesDeleted.count;

      // 4. Excluir vínculos com empresas
      const companiesDeleted = await tx.userCompany.deleteMany({
        where: { userId },
      });
      summary.userCompanies = companiesDeleted.count;

      // 5. Anonimizar logs de auditoria (não excluir por compliance)
      const auditLogsUpdated = await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });
      summary.auditLogsAnonymized = auditLogsUpdated.count;

      // 6. Anonimizar assinaturas (manter registro mas sem dados pessoais)
      const signaturesUpdated = await tx.signatureRecord.updateMany({
        where: { signerId: userId },
        data: {
          signerName: '[DADOS REMOVIDOS - LGPD]',
          signerCPF: null,
          signerEmail: '[removido@lgpd.com]',
        },
      });
      summary.signaturesAnonymized = signaturesUpdated.count;

      // 7. Anonimizar processos criados
      const processesUpdated = await tx.processInstance.updateMany({
        where: { createdById: userId },
        data: {
          metadata: { lgpdAnonymized: true, anonymizedAt: new Date() },
        },
      });
      summary.processesAnonymized = processesUpdated.count;

      // 8. Finalmente, excluir o usuário
      await tx.user.delete({
        where: { id: userId },
      });
      summary.userDeleted = true;

      return summary;
    });

    // Atualiza a solicitação
    return this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        processedBy,
        deletedData,
      },
    });
  }

  /**
   * Lista solicitações de exclusão pendentes (para admins)
   */
  async listDeletionRequests(status?: string): Promise<any[]> {
    return this.prisma.dataDeletionRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  /**
   * Obtém o status da solicitação de exclusão do usuário
   */
  async getMyDeletionRequestStatus(userId: string): Promise<any> {
    return this.prisma.dataDeletionRequest.findFirst({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // POLÍTICA DE RETENÇÃO
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Obtém as políticas de retenção de dados
   */
  async getRetentionPolicies(): Promise<any[]> {
    return this.prisma.dataRetentionPolicy.findMany({
      where: { isActive: true },
      orderBy: { entityType: 'asc' },
    });
  }

  /**
   * Cria ou atualiza uma política de retenção
   */
  async upsertRetentionPolicy(
    entityType: string,
    retentionDays: number,
    description?: string,
  ): Promise<any> {
    return this.prisma.dataRetentionPolicy.upsert({
      where: { entityType },
      update: { retentionDays, description },
      create: { entityType, retentionDays, description },
    });
  }

  /**
   * Executa a limpeza de dados baseada nas políticas de retenção
   */
  async executeDataRetention(): Promise<any> {
    const policies = await this.getRetentionPolicies();
    const results: any = {};

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      switch (policy.entityType) {
        case 'AUDIT_LOG':
          const auditDeleted = await this.prisma.auditLog.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
          });
          results.auditLogs = auditDeleted.count;
          break;

        case 'REFRESH_TOKEN':
          const tokensDeleted = await this.prisma.refreshToken.deleteMany({
            where: {
              OR: [
                { expiresAt: { lt: new Date() } },
                { createdAt: { lt: cutoffDate } },
              ],
            },
          });
          results.refreshTokens = tokensDeleted.count;
          break;

        case 'DELETION_REQUEST':
          const requestsDeleted = await this.prisma.dataDeletionRequest.deleteMany({
            where: {
              status: 'COMPLETED',
              processedAt: { lt: cutoffDate },
            },
          });
          results.deletionRequests = requestsDeleted.count;
          break;
      }
    }

    return results;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // UTILITÁRIOS DE CRIPTOGRAFIA
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Criptografa o CPF de um usuário
   */
  encryptCPF(cpf: string): { encrypted: string; hash: string } {
    return this.cryptoService.encryptCPF(cpf);
  }

  /**
   * Descriptografa o CPF de um usuário
   */
  decryptCPF(encryptedCPF: string): string {
    return this.cryptoService.decryptCPF(encryptedCPF);
  }

  /**
   * Mascara o CPF para exibição
   */
  maskCPF(cpf: string): string {
    return this.cryptoService.maskCPF(cpf);
  }
}
