import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService, R2_FOLDERS } from '../storage/storage.service';
import { SimpleSignatureService, SignatureMetadata } from './simple-signature.service';
import { ModernSignatureService, SignatureMetadata as ModernSignatureMetadata } from './modern-signature.service';
import { MailerService } from '../mailer/mailer.service';
import { SignDocumentSimpleDto } from './dto/sign-document-simple.dto';
import { CreateSignatureRequirementDto } from './dto/create-signature-requirement.dto';
import { RequestSignatureOtpDto } from './dto/request-signature-otp.dto';
import { VerifySignatureOtpDto } from './dto/verify-signature-otp.dto';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private simpleSignatureService: SimpleSignatureService,
    private modernSignatureService: ModernSignatureService,
    private eventEmitter: EventEmitter2,
    private mailerService: MailerService,
  ) {}

  /**
   * Assina um documento com validação de senha do usuário
   */
  async signDocument(userId: string, dto: SignDocumentSimpleDto) {
    // 1. Buscar e validar usuário com suas empresas/setores
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          select: {
            sectorId: true,
            companyId: true,
            company: { select: { id: true, name: true } },
            sector: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // 2. Validar senha do usuário
    const isValidPassword = await bcrypt.compare(dto.userPassword, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Senha incorreta. Por favor, verifique sua senha e tente novamente. ' +
        'A senha deve ser a mesma utilizada para acessar o sistema.'
      );
    }

    // 3. Buscar anexo
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: dto.attachmentId },
      include: {
        stepExecution: {
          include: {
            stepVersion: {
              include: {
                signatureRequirements: {
                  include: {
                    signatureRecords: true,
                    user: { select: { id: true, name: true, email: true } },
                    sector: { select: { id: true, name: true } },
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
            processInstance: {
              include: {
                createdBy: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // 4. Verificar se etapa requer assinatura OU se há requisitos criados
    const hasRequirements = attachment.stepExecution.stepVersion.signatureRequirements?.length > 0;

    if (!attachment.stepExecution.stepVersion.requiresSignature && !hasRequirements) {
      throw new BadRequestException('Esta etapa não requer assinatura');
    }

    // 5. Verificar se anexo é PDF
    if (attachment.mimeType !== 'application/pdf') {
      throw new BadRequestException('Apenas arquivos PDF podem ser assinados');
    }

    // 6. Encontrar requirement correspondente PARA ESTE ARQUIVO ESPECÍFICO
    const requirements = attachment.stepExecution.stepVersion.signatureRequirements.filter(
      r => !r.attachmentId || r.attachmentId === dto.attachmentId // permitir requisitos globais da etapa
    );

    // Extrair IDs dos setores do usuário APENAS da empresa do processo (segurança multi-tenant)
    const processCompanyId = attachment.stepExecution.processInstance.companyId;
    const userSectorIds = user.userCompanies
      .filter(uc => uc.companyId === processCompanyId)
      .map(uc => uc.sectorId)
      .filter(id => id !== null);

    // Buscar requirement que corresponda ao usuário OU ao setor do usuário
    const requirement = requirements.find(
      r => r.userId === userId || (r.sectorId && userSectorIds.includes(r.sectorId)),
    );

    // Se não encontrou requirement específico para este usuário, não pode assinar
    if (!requirement) {
      throw new ForbiddenException(
        'Você não está configurado como assinante deste documento. ' +
        'Verifique se o documento foi configurado corretamente com seus dados como assinante.'
      );
    }

    // 7-13. Executar verificação de duplicata e criação do registro em transaction
    // para prevenir race condition (double-signing)
    const { signatureRecord, allSigned, existingSignaturesCount } = await this.prisma.$transaction(async (tx) => {
      // 7. Verificar se já assinou (dentro da transaction para atomicidade)
      const existingSignature = await tx.signatureRecord.findFirst({
        where: {
          requirementId: requirement.id,
          signerId: userId,
          attachmentId: dto.attachmentId,
        },
      });

      if (existingSignature) {
        throw new BadRequestException('Você já assinou este documento');
      }

      // 8. Verificar ordem de assinatura (se SEQUENTIAL)
      if (requirement.type === 'SEQUENTIAL') {
        const previousRequirements = requirements.filter(r => r.order < requirement.order);
        for (const prevReq of previousRequirements) {
          const prevSignature = await tx.signatureRecord.findFirst({
            where: {
              requirementId: prevReq.id,
              attachmentId: dto.attachmentId,
              status: 'COMPLETED',
            },
          });
          if (!prevSignature) {
            throw new BadRequestException(
              `Aguardando assinatura de ${prevReq.user?.name || prevReq.sector?.name} (ordem ${prevReq.order})`,
            );
          }
        }
      }

      // 10. Contar quantas assinaturas já existem NESTE ARQUIVO para determinar a posição
      const txExistingSignaturesCount = await tx.signatureRecord.count({
        where: {
          attachmentId: dto.attachmentId,
          status: 'COMPLETED',
        },
      });

      // 9. Preparar metadados da assinatura
      // Obter empresa e setor do usuário na empresa do processo
      const userCompanyForProcess = user.userCompanies.find(uc => uc.companyId === processCompanyId);
      const primaryCompany = userCompanyForProcess || user.userCompanies?.[0];
      const companyName = primaryCompany?.company?.name;
      const sectorName = primaryCompany?.sector?.name;

      const metadata: SignatureMetadata = {
        signer: {
          name: user.name,
          cpf: user.cpf ?? undefined,
          email: user.email,
          company: companyName,
          sector: sectorName,
        },
        reason: dto.reason || 'Assinatura Digital',
        location: dto.location,
        contactInfo: dto.contactInfo,
        ipAddress: dto.ipAddress,
      };

      // 11. Baixar PDF do R2 para processamento local
      const tempDir = join(process.cwd(), 'uploads', 'signatures');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true, mode: 0o700 }); // Permissões restritas
      }

      const tempInputPath = join(tempDir, `input-${Date.now()}-${attachment.filename}`);
      const tempSignedPath = join(tempDir, `signed-${Date.now()}-${attachment.filename}`);

      // Função auxiliar para cleanup seguro de arquivos temporários
      const cleanupTempFiles = () => {
        try {
          if (existsSync(tempInputPath)) unlinkSync(tempInputPath);
        } catch (e) {
          this.logger.warn(`Falha ao remover arquivo temporário: ${tempInputPath}`);
        }
        try {
          if (existsSync(tempSignedPath)) unlinkSync(tempSignedPath);
        } catch (e) {
          this.logger.warn(`Falha ao remover arquivo temporário: ${tempSignedPath}`);
        }
      };

      let signatureResult;
      try {
        // Baixar arquivo do R2
        const pdfBuffer = await this.storageService.getBuffer(attachment.path);
        writeFileSync(tempInputPath, pdfBuffer, { mode: 0o600 }); // Permissões restritas

        // Assinar PDF com design moderno, QR Code e página de validação
        signatureResult = await this.modernSignatureService.signPDF(
          tempInputPath,
          tempSignedPath,
          metadata,
          dto.userPassword,
          txExistingSignaturesCount,
        );

        // 11.5. Fazer upload do arquivo assinado de volta para R2 (substituindo o original)
        const { readFileSync } = await import('fs');
        const signedBuffer = readFileSync(tempSignedPath);
        await this.storageService.replaceBuffer(
          signedBuffer,
          attachment.path,
          attachment.originalName,
          'application/pdf',
        );
      } finally {
        // Garantir limpeza de arquivos temporários mesmo em caso de erro
        cleanupTempFiles();
      }

      // 12. Criar registro de assinatura
      const txSignatureRecord = await tx.signatureRecord.create({
        data: {
          requirementId: requirement.id,
          attachmentId: dto.attachmentId,
          signerId: userId,
          stepExecutionId: dto.stepExecutionId,
          status: 'COMPLETED',

          // Dados do assinante
          signerName: user.name,
          signerCPF: user.cpf,
          signerEmail: user.email,

          // Dados da assinatura
          signedAt: new Date(),
          signatureHash: signatureResult.signatureHash,
          documentHash: signatureResult.documentHash,
          signatureToken: signatureResult.signatureToken,
          signatureReason: dto.reason,

          // Metadados
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          metadata: {
            contactInfo: dto.contactInfo,
            geolocation: dto.geolocation,
          },
        },
        include: {
          signer: {
            select: {
              id: true,
              name: true,
              email: true,
              cpf: true,
            },
          },
          requirement: true,
        },
      });

      // 13. Verificar se todas as assinaturas DESTE ARQUIVO foram concluídas
      const txAllRequirements = await tx.signatureRequirement.findMany({
        where: {
          attachmentId: dto.attachmentId,
        },
        include: {
          signatureRecords: {
            where: {
              attachmentId: dto.attachmentId,
              status: 'COMPLETED',
            },
          },
        },
      });

      const txAllSigned = txAllRequirements.every(req => req.signatureRecords.length > 0);

      // IMPORTANTE: Só marcar como assinado quando TODAS as assinaturas forem concluídas
      if (txAllSigned) {
        await tx.attachment.update({
          where: { id: dto.attachmentId },
          data: {
            isSigned: true,
          },
        });

        await tx.stepExecution.update({
          where: { id: dto.stepExecutionId },
          data: {
            signedAt: new Date(),
          },
        });
      }

      return {
        signatureRecord: txSignatureRecord,
        allSigned: txAllSigned,
        existingSignaturesCount: txExistingSignaturesCount,
      };
    });

    // 14. Notificar próximo assinante e emitir eventos (fora da transaction)
    const processInstance = attachment.stepExecution.processInstance;
    const sigCompanyId = processInstance.companyId;
    const sigProcessTitle = processInstance.title || processInstance.code;
    const sigProcessId = processInstance.id;

    // Evento: assinatura concluída (notifica criador do processo)
    this.eventEmitter.emit('signature.completed', {
      creatorId: processInstance.createdBy.id,
      companyId: sigCompanyId,
      processTitle: sigProcessTitle,
      processId: sigProcessId,
      signerName: user.name,
    });

    if (requirement.type === 'SEQUENTIAL') {
      const attachmentRequirements = await this.prisma.signatureRequirement.findMany({
        where: {
          stepVersionId: attachment.stepExecution.stepVersionId,
          OR: [
            { attachmentId: dto.attachmentId },
            { attachmentId: null },
          ],
        },
        include: {
          user: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          signatureRecords: {
            where: {
              attachmentId: dto.attachmentId,
              status: 'COMPLETED',
            },
          },
        },
        orderBy: { order: 'asc' },
      });

      const nextRequirement = attachmentRequirements.find(req =>
        req.order > requirement.order && req.signatureRecords.length === 0
      );

      if (nextRequirement?.user?.id) {
        // Evento: assinatura pendente para o próximo assinante
        this.eventEmitter.emit('signature.pending', {
          userId: nextRequirement.user.id,
          companyId: sigCompanyId,
          processTitle: sigProcessTitle,
          processId: sigProcessId,
          documentName: attachment.originalName,
        });
      }
    }

    return {
      success: true,
      signatureRecord,
      signedPath: attachment.path,
      signatureToken: signatureRecord.requirement ? signatureRecord.signatureToken : undefined,
      allRequirementsMet: allSigned,
    };
  }

  /**
   * Validação pública de assinatura (sem autenticação)
   */
  async validatePublicSignature(signatureToken: string, documentHash?: string) {
    // Buscar assinatura pelo token
    const signature = await this.prisma.signatureRecord.findFirst({
      where: { signatureToken },
      include: {
        signer: {
          select: {
            name: true,
            email: true,
            cpf: true,
          },
        },
        attachment: {
          select: {
            originalName: true,
            mimeType: true,
          },
        },
        stepExecution: {
          include: {
            processInstance: {
              select: {
                code: true,
                title: true,
                description: true,
              },
            },
            stepVersion: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!signature) {
      return {
        valid: false,
        message: 'Token de assinatura não encontrado no sistema',
      };
    }

    // Verificar integridade do documento (se hash fornecido)
    let documentIntegrity: {
      isValid: boolean;
      providedHash: string;
      originalHash: string | null;
      message: string;
    } | null = null;
    if (documentHash) {
      const isValid = documentHash.toLowerCase() === signature.documentHash?.toLowerCase();
      documentIntegrity = {
        isValid,
        providedHash: documentHash,
        originalHash: signature.documentHash,
        message: isValid
          ? 'Documento íntegro - não foi alterado desde a assinatura'
          : 'ATENÇÃO: O documento foi alterado após a assinatura',
      };
    }

    return {
      valid: true,
      signature: {
        // Dados do assinante
        signerName: signature.signerName,
        signerCPF: signature.signerCPF,
        signerEmail: signature.signerEmail,

        // Dados da assinatura
        signedAt: signature.signedAt,
        reason: signature.signatureReason,
        ipAddress: signature.ipAddress,

        // Dados do processo
        processCode: signature.stepExecution.processInstance.code,
        processTitle: signature.stepExecution.processInstance.title,
        stepName: signature.stepExecution.stepVersion.name,

        // Dados do documento
        documentName: signature.attachment.originalName,
        documentType: signature.attachment.mimeType,
      },
      documentIntegrity,
      token: signatureToken,
      validatedAt: new Date(),
    };
  }

  /**
   * Cria requisito de assinatura para uma etapa
   */
  async createSignatureRequirement(dto: CreateSignatureRequirementDto) {
    if (!dto.userId && !dto.sectorId) {
      throw new BadRequestException(
        'Informe userId ou sectorId para o assinante',
      );
    }

    const stepVersion = await this.prisma.stepVersion.findUnique({
      where: { id: dto.stepVersionId },
    });

    if (!stepVersion) {
      throw new NotFoundException('Etapa não encontrada');
    }

    // Verificar duplicatas (attachmentId pode ser null para requisitos globais)
    const existing = await this.prisma.signatureRequirement.findFirst({
      where: {
        stepVersionId: dto.stepVersionId,
        attachmentId: dto.attachmentId ?? null,
        order: dto.order,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe um requisito com ordem ${dto.order} para este anexo`,
      );
    }

    const requirement = await this.prisma.signatureRequirement.create({
      data: {
        stepVersionId: dto.stepVersionId,
        order: dto.order,
        type: dto.type,
        isRequired: dto.isRequired ?? true,
        description: dto.description,
        userId: dto.userId,
        sectorId: dto.sectorId,
        attachmentId: dto.attachmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sector: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Notificar o assinante
    if (requirement.attachmentId) {
      await this.notifySigners([requirement]);
    }

    return requirement;
  }

  /**
   * Cria múltiplos requisitos de assinatura de uma vez
   */
  async createMultipleSignatureRequirements(requirements: CreateSignatureRequirementDto[]) {
    const created: any[] = [];
    const errors: any[] = [];

    for (const dto of requirements) {
      try {
        // Validar campos obrigatórios
        if (!dto.userId && !dto.sectorId) {
          errors.push({
            dto,
            error: 'Informe userId ou sectorId para o assinante',
          });
          continue;
        }

        // Verificar se a etapa existe
        const stepVersion = await this.prisma.stepVersion.findUnique({
          where: { id: dto.stepVersionId },
        });

        if (!stepVersion) {
          errors.push({
            dto,
            error: 'Etapa não encontrada',
          });
          continue;
        }

        // Verificar se já existe um requisito duplicado
        // Busca por: mesmo stepVersion + mesmo anexo + mesmo usuário/setor
        // Isso evita criar requisitos duplicados quando o mesmo arquivo é usado múltiplas vezes
        const existing = await this.prisma.signatureRequirement.findFirst({
          where: {
            stepVersionId: dto.stepVersionId,
            attachmentId: dto.attachmentId,
            ...(dto.userId ? { userId: dto.userId } : {}),
            ...(dto.sectorId ? { sectorId: dto.sectorId } : {}),
            // Verifica se não há assinatura completa ainda
            signatureRecords: {
              none: {
                status: 'COMPLETED'
              }
            }
          },
        });

        if (existing) {
          errors.push({
            dto,
            error: `Requisito de assinatura já existe para este usuário/setor neste anexo`,
          });
          continue;
        }

        // Criar o requisito
        const requirement = await this.prisma.signatureRequirement.create({
          data: {
            stepVersionId: dto.stepVersionId,
            order: dto.order,
            type: dto.type,
            isRequired: dto.isRequired ?? true,
            description: dto.description,
            userId: dto.userId,
            sectorId: dto.sectorId,
            attachmentId: dto.attachmentId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            sector: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        created.push(requirement);
      } catch (error) {
        errors.push({
          dto,
          error: error.message || 'Erro ao criar requisito',
        });
      }
    }

    // Emitir notificações para os assinantes após criar requisitos
    if (created.length > 0) {
      await this.notifySigners(created);
    }

    return {
      success: errors.length === 0,
      created,
      errors,
      total: requirements.length,
      createdCount: created.length,
      errorCount: errors.length,
    };
  }

  /**
   * Notifica assinantes após criação de requisitos
   */
  private async notifySigners(createdRequirements: any[]) {
    try {
      // Agrupar por attachmentId para buscar contexto do processo
      const byAttachment = new Map<string, any[]>();
      for (const req of createdRequirements) {
        const key = req.attachmentId || 'global';
        if (!byAttachment.has(key)) byAttachment.set(key, []);
        byAttachment.get(key)!.push(req);
      }

      for (const [attachmentId, reqs] of byAttachment) {
        if (attachmentId === 'global') continue;

        // Buscar contexto do processo via attachment
        const attachment = await this.prisma.attachment.findUnique({
          where: { id: attachmentId },
          include: {
            stepExecution: {
              include: {
                processInstance: {
                  select: { id: true, title: true, code: true, companyId: true },
                },
              },
            },
          },
        });

        if (!attachment?.stepExecution?.processInstance) continue;

        const processInstance = attachment.stepExecution.processInstance;
        const processTitle = processInstance.title || processInstance.code;
        const processId = processInstance.id;
        const companyId = processInstance.companyId;
        const documentName = attachment.originalName;

        // Determinar tipo (todos os reqs de um mesmo attachment devem ter o mesmo tipo)
        const signatureType = reqs[0].type || 'PARALLEL';

        if (signatureType === 'SEQUENTIAL') {
          // Notificar apenas o primeiro assinante (menor order)
          const sorted = [...reqs].sort((a, b) => (a.order || 0) - (b.order || 0));
          const first = sorted[0];
          if (first?.user?.id) {
            this.eventEmitter.emit('signature.pending', {
              userId: first.user.id,
              companyId,
              processTitle,
              processId,
              documentName,
            });
          }
        } else {
          // PARALLEL: notificar todos os assinantes
          for (const req of reqs) {
            if (req.user?.id) {
              this.eventEmitter.emit('signature.pending', {
                userId: req.user.id,
                companyId,
                processTitle,
                processId,
                documentName,
              });
            }
          }
        }
      }
    } catch (error) {
      // Não bloquear o fluxo por erro de notificação
    }
  }

  /**
   * Lista requisitos de assinatura de uma etapa
   */
  async getSignatureRequirements(stepVersionId: string) {
    return this.prisma.signatureRequirement.findMany({
      where: { stepVersionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sector: {
          select: {
            id: true,
            name: true,
          },
        },
        signatureRecords: {
          include: {
            signer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Lista assinaturas de um anexo
   */
  async getAttachmentSignatures(attachmentId: string) {
    return this.prisma.signatureRecord.findMany({
      where: { attachmentId },
      include: {
        signer: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
          },
        },
        requirement: {
          select: {
            order: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Verifica assinaturas de um PDF
   */
  async verifySignatures(attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        signatureRecords: {
          select: {
            signatureToken: true,
            documentHash: true,
            signerName: true,
            signedAt: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    if (!attachment.isSigned || attachment.signatureRecords.length === 0) {
      throw new BadRequestException('Este anexo não possui assinaturas');
    }

    const signatures = attachment.signatureRecords.map(sig => ({
      token: sig.signatureToken,
      signer: sig.signerName,
      signedAt: sig.signedAt,
      documentHash: sig.documentHash,
    }));

    return {
      isValid: signatures.length > 0,
      totalSignatures: signatures.length,
      signatures,
      message: `Documento possui ${signatures.length} assinatura(s) válida(s)`,
    };
  }

  /**
   * Busca anexo para download
   */
  async getAttachmentForDownload(attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        path: true,
        isSigned: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    return attachment;
  }

  /**
   * Busca status detalhado das assinaturas de um anexo
   * Retorna informações sobre quem já assinou, quem está aguardando e a ordem
   */
  async getSignatureStatus(attachmentId: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        stepExecution: {
          include: {
            stepVersion: {
              include: {
                signatureRequirements: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    sector: { select: { id: true, name: true } },
                    signatureRecords: {
                      where: { attachmentId },
                      include: {
                        signer: { select: { id: true, name: true, email: true } },
                      },
                    },
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
            processInstance: {
              include: {
                createdBy: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Filtrar requisitos apenas para este anexo específico OU requisitos globais (attachmentId = null)
    const allRequirements = attachment.stepExecution.stepVersion.signatureRequirements;
    const requirements = allRequirements.filter(
      req => !req.attachmentId || req.attachmentId === attachmentId
    );

    // Buscar setores do usuário
    const userCompanies = await this.prisma.userCompany.findMany({
      where: { userId },
      select: { sectorId: true },
    });
    const userSectorIds = userCompanies.map(uc => uc.sectorId).filter(id => id !== null);

    // Mapear os requisitos com status detalhado
    const signatureDetails = requirements.map((req, index) => {
      const isSigned = req.signatureRecords.length > 0 &&
                       req.signatureRecords.some(r => r.status === 'COMPLETED');
      const signatureRecord = req.signatureRecords.find(r => r.status === 'COMPLETED');

      // Verificar se é o requisito do usuário atual
      const isCurrentUser = req.userId === userId ||
                           (req.sectorId && userSectorIds.includes(req.sectorId));

      // Determinar o nome do responsável
      const responsibleName = req.user?.name || req.sector?.name || 'Não definido';

      // Status da assinatura para este requisito
      let status: 'completed' | 'pending' | 'waiting' | 'available';
      let statusMessage: string;

      if (isSigned) {
        status = 'completed';
        const signedDate = signatureRecord?.signedAt ? new Date(signatureRecord.signedAt).toLocaleString('pt-BR') : '';
        statusMessage = `Assinado por ${signatureRecord?.signer?.name || 'usuário'} em ${signedDate}`;
      } else if (req.type === 'SEQUENTIAL') {
        // Para sequencial, verificar se os anteriores já assinaram
        const previousRequirements = requirements.filter(r => r.order < req.order);
        const allPreviousSigned = previousRequirements.every(prevReq =>
          prevReq.signatureRecords.some(r => r.status === 'COMPLETED')
        );

        if (allPreviousSigned) {
          status = 'available';
          statusMessage = isCurrentUser
            ? 'Disponível para sua assinatura'
            : `Aguardando assinatura de ${responsibleName}`;
        } else {
          status = 'waiting';
          // Encontrar quem está pendente antes
          const pendingBefore = previousRequirements.find(prevReq =>
            !prevReq.signatureRecords.some(r => r.status === 'COMPLETED')
          );
          const waitingFor = pendingBefore?.user?.name || pendingBefore?.sector?.name || 'assinante anterior';
          statusMessage = `Aguardando ${waitingFor} assinar primeiro`;
        }
      } else {
        // PARALLEL - todos podem assinar ao mesmo tempo
        status = 'available';
        statusMessage = isCurrentUser
          ? 'Disponível para sua assinatura'
          : `Aguardando assinatura de ${responsibleName}`;
      }

      return {
        order: req.order,
        type: req.type,
        responsible: {
          id: req.userId || req.sectorId,
          name: responsibleName,
          type: req.userId ? 'user' : 'sector',
        },
        isCurrentUser,
        status,
        statusMessage,
        isSigned,
        signedAt: signatureRecord?.signedAt || null,
        signedBy: signatureRecord?.signer || null,
      };
    });

    // Verificar se o usuário pode assinar agora
    const userRequirement = signatureDetails.find(d => d.isCurrentUser);
    const canSign = userRequirement &&
                   !userRequirement.isSigned &&
                   (userRequirement.status === 'available');

    return {
      attachmentId,
      attachmentName: attachment.originalName,
      isSigned: attachment.isSigned,
      totalSignatures: requirements.length,
      completedSignatures: signatureDetails.filter(d => d.isSigned).length,
      signatureDetails,
      canSign,
      currentUserOrder: userRequirement?.order || null,
      signatureType: requirements[0]?.type || 'PARALLEL',
    };
  }

  /**
   * Assina um documento de sub-tarefa
   * Sub-tarefas armazenam anexos diretamente na tabela SubTask, não em Attachment
   */
  async signSubTaskDocument(userId: string, dto: {
    subTaskId: string;
    userPassword: string;
    reason?: string;
    location?: string;
    contactInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    geolocation?: string;
  }) {
    // 1. Buscar e validar usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          select: {
            sectorId: true,
            companyId: true,
            company: { select: { id: true, name: true } },
            sector: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // 2. Validar senha do usuário
    const isValidPassword = await bcrypt.compare(dto.userPassword, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Senha incorreta. Por favor, verifique sua senha e tente novamente.'
      );
    }

    // 3. Buscar sub-tarefa
    const subTask = await this.prisma.subTask.findUnique({
      where: { id: dto.subTaskId },
      include: {
        stepExecution: {
          include: {
            processInstance: {
              include: {
                createdBy: { select: { id: true, name: true } },
              },
            },
          },
        },
        subTaskTemplate: true,
      },
    });

    if (!subTask) {
      throw new NotFoundException('Sub-tarefa não encontrada');
    }

    if (!subTask.attachmentPath || !subTask.attachmentName) {
      throw new NotFoundException('Anexo não encontrado na sub-tarefa');
    }

    // 4. Verificar se requer assinatura
    if (!subTask.requireSignature) {
      throw new BadRequestException('Esta sub-tarefa não requer assinatura');
    }

    // 5. Verificar se o usuário é um dos assinantes
    let signerIds: string[] = [];
    if (subTask.signers) {
      try {
        signerIds = typeof subTask.signers === 'string'
          ? JSON.parse(subTask.signers)
          : subTask.signers;
      } catch (e) {
        signerIds = [];
      }
    }

    if (signerIds.length > 0 && !signerIds.includes(userId)) {
      throw new ForbiddenException('Você não está na lista de assinantes desta sub-tarefa');
    }

    // 6. Verificar se anexo é PDF
    const isPdf = subTask.attachmentName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new BadRequestException('Apenas arquivos PDF podem ser assinados');
    }

    // 7. Verificar se já assinou (usando metadados na sub-tarefa)
    // Para sub-tarefas, armazenamos as assinaturas em um campo JSON
    let existingSignatures: any[] = [];
    if (subTask['signatures']) {
      try {
        existingSignatures = typeof subTask['signatures'] === 'string'
          ? JSON.parse(subTask['signatures'])
          : subTask['signatures'];
      } catch (e) {
        existingSignatures = [];
      }
    }

    const alreadySigned = existingSignatures.some(sig => sig.signerId === userId);
    if (alreadySigned) {
      throw new BadRequestException('Você já assinou este documento');
    }

    // 8. Verificar ordem de assinatura (se sequencial)
    if (subTask.signatureType === 'SEQUENTIAL') {
      const userIndex = signerIds.indexOf(userId);
      if (userIndex > 0) {
        // Verificar se todos os anteriores assinaram
        for (let i = 0; i < userIndex; i++) {
          const previousSignerId = signerIds[i];
          const previousSigned = existingSignatures.some(sig => sig.signerId === previousSignerId);
          if (!previousSigned) {
            throw new BadRequestException('Aguarde os assinantes anteriores concluírem suas assinaturas');
          }
        }
      }
    }

    // 9. Preparar metadados da assinatura
    // Obter empresa e setor principal do usuário
    const primaryCompanySubTask = user.userCompanies?.[0];
    const companyNameSubTask = primaryCompanySubTask?.company?.name;
    const sectorNameSubTask = primaryCompanySubTask?.sector?.name;

    const metadata: ModernSignatureMetadata = {
      signer: {
        name: user.name,
        cpf: user.cpf || '',
        email: user.email,
        company: companyNameSubTask,
        sector: sectorNameSubTask,
      },
      reason: dto.reason || `Assinatura de sub-tarefa: ${subTask.subTaskTemplate?.name || 'Sub-tarefa'}`,
      location: dto.location || 'Sistema SoloFlow',
      contactInfo: dto.contactInfo || user.email,
      ipAddress: dto.ipAddress,
    };

    // 10. Baixar PDF do R2 para processamento local
    const tempDir = join(process.cwd(), 'uploads', 'signatures');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true, mode: 0o700 });
    }

    const tempInputPath = join(tempDir, `input-subtask-${Date.now()}-${subTask.attachmentName}`);
    const tempSignedPath = join(tempDir, `signed-subtask-${Date.now()}-${subTask.attachmentName}`);

    // Função auxiliar para cleanup seguro de arquivos temporários
    const cleanupTempFiles = () => {
      try {
        if (existsSync(tempInputPath)) unlinkSync(tempInputPath);
      } catch (e) {
        this.logger.warn(`Falha ao remover arquivo temporário: ${tempInputPath}`);
      }
      try {
        if (existsSync(tempSignedPath)) unlinkSync(tempSignedPath);
      } catch (e) {
        this.logger.warn(`Falha ao remover arquivo temporário: ${tempSignedPath}`);
      }
    };

    let signatureResult;
    try {
      // Baixar arquivo do R2
      const pdfBuffer = await this.storageService.getBuffer(subTask.attachmentPath);
      writeFileSync(tempInputPath, pdfBuffer, { mode: 0o600 });

      // Aplicar assinatura visual no PDF
      signatureResult = await this.modernSignatureService.signPDF(
        tempInputPath,
        tempSignedPath,
        metadata,
        dto.userPassword,
        existingSignatures.length, // Ordem da assinatura
      );

      // 11. Fazer upload do arquivo assinado de volta para R2 (substituindo o original)
      const { readFileSync } = await import('fs');
      const signedBuffer = readFileSync(tempSignedPath);
      await this.storageService.replaceBuffer(
        signedBuffer,
        subTask.attachmentPath,
        subTask.attachmentName,
        'application/pdf',
      );
    } finally {
      // Garantir limpeza de arquivos temporários mesmo em caso de erro
      cleanupTempFiles();
    }

    // 12. Registrar assinatura nos metadados da sub-tarefa
    const newSignature = {
      signerId: userId,
      signerName: user.name,
      signerEmail: user.email,
      signerCPF: user.cpf,
      signedAt: new Date().toISOString(),
      signatureHash: signatureResult.signatureHash,
      signatureToken: signatureResult.signatureToken,
      documentHash: signatureResult.documentHash,
      reason: dto.reason,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      geolocation: dto.geolocation,
    };

    existingSignatures.push(newSignature);

    // 13. Atualizar sub-tarefa com as assinaturas
    await this.prisma.$executeRaw`
      UPDATE sub_tasks
      SET signatures = ${JSON.stringify(existingSignatures)}
      WHERE id = ${dto.subTaskId}
    `;

    // 14. Verificar se todas as assinaturas foram concluídas
    const allSigned = signerIds.length === 0 ||
      signerIds.every(signerId => existingSignatures.some(sig => sig.signerId === signerId));

    return {
      success: true,
      signature: newSignature,
      signedPath: subTask.attachmentPath,
      signatureToken: signatureResult.signatureToken,
      allRequirementsMet: allSigned,
      totalSigners: signerIds.length,
      completedSignatures: existingSignatures.length,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // 2FA - OTP POR EMAIL PARA ASSINATURA DIGITAL
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Solicita um OTP por email para confirmar assinatura digital.
   * Valida a senha do usuário antes de enviar o código.
   */
  async requestSignatureOtp(userId: string, dto: RequestSignatureOtpDto) {
    // 1. Buscar e validar usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // 2. Validar senha do usuário
    const isValidPassword = await bcrypt.compare(dto.userPassword, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Senha incorreta. Por favor, verifique sua senha e tente novamente. ' +
        'A senha deve ser a mesma utilizada para acessar o sistema.'
      );
    }

    // 3. Verificar se o anexo existe
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: dto.attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // 4. Invalidar OTPs anteriores para o mesmo usuário e anexo
    await this.prisma.signatureOtp.updateMany({
      where: {
        userId,
        attachmentId: dto.attachmentId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Marca como usado para invalidar
      },
    });

    // 5. Gerar código OTP de 6 dígitos
    const otpCode = String(randomInt(100000, 999999));

    // 6. Salvar no banco com expiração de 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await this.prisma.signatureOtp.create({
      data: {
        code: otpCode,
        userId,
        attachmentId: dto.attachmentId,
        expiresAt,
      },
    });

    // 7. Enviar email com o código OTP
    try {
      await this.mailerService.sendSignatureOtpEmail(
        user.email,
        user.name,
        otpCode,
      );
    } catch (error) {
      this.logger.error(`Falha ao enviar OTP por email para ${user.email}: ${error.message}`);
      throw new BadRequestException(
        'Não foi possível enviar o código de verificação por email. Tente novamente.'
      );
    }

    this.logger.log(`OTP de assinatura gerado para usuário ${user.email}, anexo ${dto.attachmentId}`);

    return {
      success: true,
      expiresIn: 300, // 5 minutos em segundos
      message: 'Código de verificação enviado para seu email',
    };
  }

  /**
   * Verifica o OTP e realiza a assinatura do documento.
   * Pula a validação de senha pois já foi validada no requestSignatureOtp.
   */
  async verifySignatureOtpAndSign(userId: string, dto: VerifySignatureOtpDto) {
    // 1. Buscar o OTP válido para este usuário e anexo
    const otpRecord = await this.prisma.signatureOtp.findFirst({
      where: {
        code: dto.otpCode,
        userId,
        attachmentId: dto.attachmentId,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException(
        'Código de verificação inválido. Verifique o código recebido por email.'
      );
    }

    // 2. Verificar expiração
    if (new Date() > otpRecord.expiresAt) {
      throw new UnauthorizedException(
        'Código de verificação expirado. Solicite um novo código.'
      );
    }

    // 3. Marcar OTP como usado
    await this.prisma.signatureOtp.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // 4. Buscar usuário com suas empresas/setores
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          select: {
            sectorId: true,
            companyId: true,
            company: { select: { id: true, name: true } },
            sector: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // 5. Buscar anexo com todas as relações necessárias
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: dto.attachmentId },
      include: {
        stepExecution: {
          include: {
            stepVersion: {
              include: {
                signatureRequirements: {
                  include: {
                    signatureRecords: true,
                    user: { select: { id: true, name: true, email: true } },
                    sector: { select: { id: true, name: true } },
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
            processInstance: {
              include: {
                createdBy: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // 6. Verificar se etapa requer assinatura OU se há requisitos criados
    const hasRequirements = attachment.stepExecution.stepVersion.signatureRequirements?.length > 0;

    if (!attachment.stepExecution.stepVersion.requiresSignature && !hasRequirements) {
      throw new BadRequestException('Esta etapa não requer assinatura');
    }

    // 7. Verificar se anexo é PDF
    if (attachment.mimeType !== 'application/pdf') {
      throw new BadRequestException('Apenas arquivos PDF podem ser assinados');
    }

    // 8. Encontrar requirement correspondente PARA ESTE ARQUIVO ESPECÍFICO
    const requirements = attachment.stepExecution.stepVersion.signatureRequirements.filter(
      r => !r.attachmentId || r.attachmentId === dto.attachmentId
    );

    // Extrair IDs dos setores do usuário
    const userSectorIds = user.userCompanies.map(uc => uc.sectorId).filter(id => id !== null);

    // Buscar requirement que corresponda ao usuário OU ao setor do usuário
    const requirement = requirements.find(
      r => r.userId === userId || (r.sectorId && userSectorIds.includes(r.sectorId)),
    );

    if (!requirement) {
      throw new ForbiddenException(
        'Você não está configurado como assinante deste documento. ' +
        'Verifique se o documento foi configurado corretamente com seus dados como assinante.'
      );
    }

    // 9. Verificar se já assinou
    const existingSignature = await this.prisma.signatureRecord.findFirst({
      where: {
        requirementId: requirement.id,
        signerId: userId,
        attachmentId: dto.attachmentId,
      },
    });

    if (existingSignature) {
      throw new BadRequestException('Você já assinou este documento');
    }

    // 10. Verificar ordem de assinatura (se SEQUENTIAL)
    if (requirement.type === 'SEQUENTIAL') {
      const previousRequirements = requirements.filter(r => r.order < requirement.order);
      for (const prevReq of previousRequirements) {
        const prevSignature = prevReq.signatureRecords.find(
          s => s.status === 'COMPLETED',
        );
        if (!prevSignature) {
          throw new BadRequestException(
            `Aguardando assinatura de ${prevReq.user?.name || prevReq.sector?.name} (ordem ${prevReq.order})`,
          );
        }
      }
    }

    // 11. Preparar metadados da assinatura
    const primaryCompany = user.userCompanies?.[0];
    const companyName = primaryCompany?.company?.name;
    const sectorName = primaryCompany?.sector?.name;

    const metadata: SignatureMetadata = {
      signer: {
        name: user.name,
        cpf: user.cpf ?? undefined,
        email: user.email,
        company: companyName,
        sector: sectorName,
      },
      reason: 'Assinatura Digital',
      location: undefined,
      contactInfo: dto.contactInfo,
      ipAddress: dto.ipAddress,
    };

    // 12. Contar quantas assinaturas já existem NESTE ARQUIVO para determinar a posição
    const existingSignaturesCount = await this.prisma.signatureRecord.count({
      where: {
        attachmentId: dto.attachmentId,
        status: 'COMPLETED',
      },
    });

    // 13. Baixar PDF do R2 para processamento local
    const tempDir = join(process.cwd(), 'uploads', 'signatures');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true, mode: 0o700 });
    }

    const tempInputPath = join(tempDir, `input-${Date.now()}-${attachment.filename}`);
    const tempSignedPath = join(tempDir, `signed-${Date.now()}-${attachment.filename}`);

    // Função auxiliar para cleanup seguro de arquivos temporários
    const cleanupTempFiles = () => {
      try {
        if (existsSync(tempInputPath)) unlinkSync(tempInputPath);
      } catch (e) {
        this.logger.warn(`Falha ao remover arquivo temporário: ${tempInputPath}`);
      }
      try {
        if (existsSync(tempSignedPath)) unlinkSync(tempSignedPath);
      } catch (e) {
        this.logger.warn(`Falha ao remover arquivo temporário: ${tempSignedPath}`);
      }
    };

    let signatureResult;
    try {
      // Baixar arquivo do R2
      const pdfBuffer = await this.storageService.getBuffer(attachment.path);
      writeFileSync(tempInputPath, pdfBuffer, { mode: 0o600 });

      // Assinar PDF com design moderno, QR Code e página de validação
      // Usar a senha dummy pois a validação de senha já ocorreu na etapa do OTP
      signatureResult = await this.modernSignatureService.signPDF(
        tempInputPath,
        tempSignedPath,
        metadata,
        'otp-verified',
        existingSignaturesCount,
      );

      // 14. Fazer upload do arquivo assinado de volta para R2
      const { readFileSync } = await import('fs');
      const signedBuffer = readFileSync(tempSignedPath);
      await this.storageService.replaceBuffer(
        signedBuffer,
        attachment.path,
        attachment.originalName,
        'application/pdf',
      );
    } finally {
      // Garantir limpeza de arquivos temporários mesmo em caso de erro
      cleanupTempFiles();
    }

    // 15. Criar registro de assinatura com metadados do 2FA
    const signatureRecord = await this.prisma.signatureRecord.create({
      data: {
        requirementId: requirement.id,
        attachmentId: dto.attachmentId,
        signerId: userId,
        stepExecutionId: dto.stepExecutionId || attachment.stepExecution.id,
        status: 'COMPLETED',

        // Dados do assinante
        signerName: user.name,
        signerCPF: user.cpf,
        signerEmail: user.email,

        // Dados da assinatura
        signedAt: new Date(),
        signatureHash: signatureResult.signatureHash,
        documentHash: signatureResult.documentHash,
        signatureToken: signatureResult.signatureToken,
        signatureReason: 'Assinatura Digital com verificação 2FA',

        // Metadados
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        metadata: {
          authMethod: 'password+email_otp',
          otpVerifiedAt: new Date().toISOString(),
          contactInfo: dto.contactInfo,
          geolocation: dto.geolocation,
        },
      },
      include: {
        signer: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
          },
        },
        requirement: true,
      },
    });

    // 16. Verificar se todas as assinaturas DESTE ARQUIVO foram concluídas
    const allRequirements = await this.prisma.signatureRequirement.findMany({
      where: {
        attachmentId: dto.attachmentId,
      },
      include: {
        signatureRecords: {
          where: {
            attachmentId: dto.attachmentId,
            status: 'COMPLETED',
          },
        },
      },
    });

    const allSigned = allRequirements.every(req => req.signatureRecords.length > 0);

    if (allSigned) {
      await this.prisma.attachment.update({
        where: { id: dto.attachmentId },
        data: {
          isSigned: true,
        },
      });
    }

    if (allSigned) {
      const stepExecutionId = dto.stepExecutionId || attachment.stepExecution.id;
      await this.prisma.stepExecution.update({
        where: { id: stepExecutionId },
        data: {
          signedAt: new Date(),
        },
      });
    }

    // 17. Notificar próximo assinante e emitir eventos
    const processInstance = attachment.stepExecution.processInstance;
    const sigCompanyId = processInstance.companyId;
    const sigProcessTitle = processInstance.title || processInstance.code;
    const sigProcessId = processInstance.id;

    this.eventEmitter.emit('signature.completed', {
      creatorId: processInstance.createdBy.id,
      companyId: sigCompanyId,
      processTitle: sigProcessTitle,
      processId: sigProcessId,
      signerName: user.name,
    });

    if (requirement.type === 'SEQUENTIAL') {
      const attachmentRequirements = await this.prisma.signatureRequirement.findMany({
        where: {
          stepVersionId: attachment.stepExecution.stepVersionId,
          OR: [
            { attachmentId: dto.attachmentId },
            { attachmentId: null },
          ],
        },
        include: {
          user: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          signatureRecords: {
            where: {
              attachmentId: dto.attachmentId,
              status: 'COMPLETED',
            },
          },
        },
        orderBy: { order: 'asc' },
      });

      const nextRequirement = attachmentRequirements.find(req =>
        req.order > requirement.order && req.signatureRecords.length === 0
      );

      if (nextRequirement?.user?.id) {
        this.eventEmitter.emit('signature.pending', {
          userId: nextRequirement.user.id,
          companyId: sigCompanyId,
          processTitle: sigProcessTitle,
          processId: sigProcessId,
          documentName: attachment.originalName,
        });
      }
    }

    this.logger.log(`Documento assinado com 2FA (OTP) pelo usuário ${user.email}, anexo ${dto.attachmentId}`);

    return {
      success: true,
      signatureRecord,
      signedPath: attachment.path,
      signatureToken: signatureResult.signatureToken,
      allRequirementsMet: allSigned,
    };
  }
}
