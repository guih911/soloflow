import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SimpleSignatureService, SignatureMetadata } from './simple-signature.service';
import { ModernSignatureService } from './modern-signature.service';
import { SignDocumentSimpleDto } from './dto/sign-document-simple.dto';
import { CreateSignatureRequirementDto } from './dto/create-signature-requirement.dto';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { copyFileSync, unlinkSync } from 'fs';

@Injectable()
export class SignaturesService {
  constructor(
    private prisma: PrismaService,
    private simpleSignatureService: SimpleSignatureService,
    private modernSignatureService: ModernSignatureService,
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

    console.log(`📋 Signature requirements found for this attachment:`, {
      total: requirements.length,
      forAttachment: requirements.filter(r => r.attachmentId === dto.attachmentId).length,
      global: requirements.filter(r => !r.attachmentId).length,
      requirements: requirements.map(r => ({
        id: r.id,
        userId: r.userId,
        sectorId: r.sectorId,
        attachmentId: r.attachmentId,
        order: r.order,
        type: r.type,
      })),
    });

    // Extrair IDs dos setores do usuário
    const userSectorIds = user.userCompanies.map(uc => uc.sectorId).filter(id => id !== null);

    console.log(`👤 User info:`, {
      userId: user.id,
      userName: user.name,
      sectorIds: userSectorIds,
    });

    // Buscar requirement que corresponda ao usuário OU ao setor do usuário
    const requirement = requirements.find(
      r => r.userId === userId || (r.sectorId && userSectorIds.includes(r.sectorId)),
    );

    console.log(`🔍 Matching requirement:`, requirement ? {
      id: requirement.id,
      userId: requirement.userId,
      sectorId: requirement.sectorId,
      matched: requirement.userId === userId ? 'by user' : 'by sector',
    } : 'NOT FOUND');

    // Se não encontrou requirement específico para este usuário, não pode assinar
    if (!requirement) {
      throw new ForbiddenException(
        'Você não está configurado como assinante deste documento. ' +
        'Verifique se o documento foi configurado corretamente com seus dados como assinante.'
      );
    }

    // 7. Verificar se já assinou
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

    // 8. Verificar ordem de assinatura (se SEQUENTIAL)
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

    // 9. Preparar metadados da assinatura
    const metadata: SignatureMetadata = {
      signer: {
        name: user.name,
        cpf: user.cpf ?? undefined,
        email: user.email,
      },
      reason: dto.reason || 'Assinatura Digital',
      location: dto.location,
      contactInfo: dto.contactInfo,
      ipAddress: dto.ipAddress, // IP público capturado
    };

    // 10. Contar quantas assinaturas já existem NESTE ARQUIVO para determinar a posição
    const existingSignaturesCount = await this.prisma.signatureRecord.count({
      where: {
        attachmentId: dto.attachmentId,
        status: 'COMPLETED',
      },
    });

    console.log(`📝 Assinando arquivo ${attachment.originalName} - Assinatura #${existingSignaturesCount + 1}`);

    // 11. Assinar PDF com design moderno, QR Code e página de validação
    const signedFilename = `signed-${Date.now()}-${attachment.filename}`;
    const tempSignedPath = join(process.cwd(), 'uploads', 'signatures', signedFilename);

    const signatureResult = await this.modernSignatureService.signPDF(
      attachment.path,
      tempSignedPath,
      metadata,
      dto.userPassword,
      existingSignaturesCount, // Passa a ordem para empilhar assinaturas verticalmente
    );

    // 11.5. Substituir arquivo original pelo assinado
    console.log(`🔄 Substituindo arquivo original ${attachment.path} pelo assinado`);
    copyFileSync(tempSignedPath, attachment.path);
    unlinkSync(tempSignedPath);
    console.log(`✅ Arquivo original substituído com sucesso`);

    // 12. Criar registro de assinatura
    const signatureRecord = await this.prisma.signatureRecord.create({
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
        geolocation: dto.geolocation,
        metadata: {
          contactInfo: dto.contactInfo,
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
    // Nota: Não filtramos por isRequired pois todos os requisitos devem ser cumpridos
    const allRequirements = await this.prisma.signatureRequirement.findMany({
      where: {
        attachmentId: dto.attachmentId, // APENAS REQUISITOS DESTE ANEXO
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

    console.log(`✅ Requisitos de assinatura para ${attachment.originalName}: ${allRequirements.length} total, ${allRequirements.filter(r => r.signatureRecords.length > 0).length} assinados`);

    // IMPORTANTE: Só marcar como assinado quando TODAS as assinaturas forem concluídas
    if (allSigned) {
      await this.prisma.attachment.update({
        where: { id: dto.attachmentId },
        data: {
          isSigned: true,
        },
      });
      console.log('📝 Anexo marcado como totalmente assinado (todas as assinaturas concluídas)');
    } else {
      console.log(`📝 Anexo ainda aguardando mais assinaturas (${allRequirements.filter(r => r.signatureRecords.length === 0).length} pendentes)`);
    }

    // Apenas registrar que todas as assinaturas foram concluídas
    // Não modificar status da etapa - a etapa já foi concluída quando o usuário clicou em "Concluir Etapa"
    if (allSigned) {
      await this.prisma.stepExecution.update({
        where: { id: dto.stepExecutionId },
        data: {
          signedAt: new Date(),
        },
      });

      console.log('All signatures completed - step already marked as COMPLETED earlier');
    }

    // 14. Log do próximo assinante (para assinaturas sequenciais)
    // Nota: Sistema de notificação pode ser implementado futuramente
    if (requirement.type === 'SEQUENTIAL') {
      // Buscar requisitos deste anexo ordenados por ordem
      const attachmentRequirements = await this.prisma.signatureRequirement.findMany({
        where: {
          stepVersionId: attachment.stepExecution.stepVersionId,
          OR: [
            { attachmentId: dto.attachmentId },
            { attachmentId: null }, // Requisitos globais
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

      // Encontrar o próximo assinante que ainda não assinou
      const nextRequirement = attachmentRequirements.find(req =>
        req.order > requirement.order && req.signatureRecords.length === 0
      );

      if (nextRequirement) {
        const nextSignerName = nextRequirement.user?.name || nextRequirement.sector?.name || 'N/A';
        console.log(`📧 Próximo assinante disponível: ${nextSignerName} (ordem ${nextRequirement.order})`);
      } else {
        console.log('✅ Todas as assinaturas para este anexo foram concluídas');
      }
    }

    return {
      success: true,
      signatureRecord,
      signedPath: attachment.path, // Retorna o path original (que agora contém o PDF assinado)
      signatureToken: signatureResult.signatureToken,
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
          console.log(`⚠️  Requisito duplicado ignorado: ${dto.userId || dto.sectorId} já tem requisito para este anexo`);
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
}
