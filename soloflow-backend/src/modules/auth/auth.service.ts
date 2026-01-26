import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { UserRole, ConsentType } from '@prisma/client';
import { ProfilesService } from '../profiles/profiles.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { LgpdService } from '../lgpd/lgpd.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private profilesService: ProfilesService,
    private lgpdService: LgpdService,
    private mailerService: MailerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (user && user.isActive && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // LGPD: Registrar consentimento implícito no login (Art. 7 LGPD)
    // O usuário concorda com a política ao fazer login
    try {
      await this.lgpdService.recordMultipleConsents(user.id, [
        { consentType: 'PRIVACY_POLICY' as ConsentType, accepted: true, ipAddress, userAgent },
        { consentType: 'TERMS_OF_USE' as ConsentType, accepted: true, ipAddress, userAgent },
      ]);
    } catch (error) {
      console.warn('Erro ao registrar consentimento LGPD:', error.message);
    }

    //  MELHORADO: Buscar empresas do usuário com validações rigorosas
    const userWithCompanies = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userCompanies: {
          where: { 
            company: { isActive: true } //    Apenas empresas ativas
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                cnpj: true,
                isActive: true,
              },
            },
            sector: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { isDefault: 'desc' },
            { lastAccessedAt: 'desc' },
          ],
        },
      },
    });

    if (!userWithCompanies?.userCompanies?.length) {
      throw new UnauthorizedException('Usuário não está vinculado a nenhuma empresa ativa');
    }

    //    Pegar empresa padrão ou mais recente
    const defaultCompany = userWithCompanies.userCompanies.find(uc => uc.isDefault) 
      || userWithCompanies.userCompanies[0];

    //    Atualizar último acesso de forma transacional
    await this.prisma.$transaction(async (tx) => {
      await tx.userCompany.update({
        where: { id: defaultCompany.id },
        data: { lastAccessedAt: new Date() },
      });

      //    Se não há empresa padrão definida, definir esta como padrão
      if (!userWithCompanies.userCompanies.some(uc => uc.isDefault)) {
        await tx.userCompany.update({
          where: { id: defaultCompany.id },
          data: { isDefault: true },
        });
      }
    });

    const resolvedPermissions = await this.profilesService.resolveUserPermissions(
      user.id,
      defaultCompany.companyId,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      companyId: defaultCompany.companyId,
      role: defaultCompany.role,
      profiles: resolvedPermissions.profileIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        activeCompany: {
          id: defaultCompany.company.id,
          companyId: defaultCompany.companyId,
          name: defaultCompany.company.name,
          role: defaultCompany.role,
          sector: defaultCompany.sector,
          isDefault: defaultCompany.isDefault,
          profileIds: resolvedPermissions.profileIds,
        },
        companies: userWithCompanies.userCompanies.map(uc => ({
          id: uc.id,
          companyId: uc.company.id,
          name: uc.company.name,
          cnpj: uc.company.cnpj,
          role: uc.role,
          sector: uc.sector,
          isDefault: uc.isDefault,
          lastAccessedAt: uc.lastAccessedAt,
        })),
        permissions: resolvedPermissions.permissions,
        processTypePermissions: resolvedPermissions.processTypes,
        profileIds: resolvedPermissions.profileIds,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    //    Verificar empresa existe E está ativa
    const company = await this.prisma.company.findFirst({
      where: { 
        id: registerDto.companyId,
        isActive: true //  CRÍTICO: Apenas empresas ativas
      },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada ou não está ativa');
    }

    //    Verificar email único
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email já cadastrado no sistema');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    //    Transação para garantir consistência
    const result = await this.prisma.$transaction(async (tx) => {
      //    Criar usuário SEM role global (role agora é por empresa)
      const newUser = await tx.user.create({
        data: {
          name: registerDto.name,
          email: registerDto.email,
          password: hashedPassword,
          //  REMOVIDO: role global (agora é por empresa via UserCompany)
        },
      });

      //    Criar vínculo com empresa como padrão
      const userCompany = await tx.userCompany.create({
        data: {
          userId: newUser.id,
          companyId: registerDto.companyId,
          role: UserRole.USER, //  Novo usuário sempre começa como USER
          isDefault: true, //  Primeira empresa é sempre padrão
          lastAccessedAt: new Date(),
        },
        include: {
          company: {
            select: { id: true, name: true, cnpj: true },
          },
          sector: { select: { id: true, name: true } },
        },
      });

      return { user: newUser, userCompany };
    });

    const resolvedPermissions = await this.profilesService.resolveUserPermissions(
      result.user.id,
      registerDto.companyId,
    );

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      companyId: registerDto.companyId,
      role: UserRole.USER,
      profiles: resolvedPermissions.profileIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        activeCompany: {
          id: result.userCompany.company.id,
          companyId: result.userCompany.companyId,
          name: result.userCompany.company.name,
          role: result.userCompany.role,
          sector: result.userCompany.sector,
          isDefault: true,
          profileIds: resolvedPermissions.profileIds,
        },
        companies: [{
          id: result.userCompany.id,
          companyId: result.userCompany.company.id,
          name: result.userCompany.company.name,
          cnpj: result.userCompany.company.cnpj,
          role: result.userCompany.role,
          sector: result.userCompany.sector,
          isDefault: true,
          lastAccessedAt: new Date(),
        }],
        permissions: resolvedPermissions.permissions,
        processTypePermissions: resolvedPermissions.processTypes,
        profileIds: resolvedPermissions.profileIds,
      },
    };
  }

  //    Switch de empresa com validacoes robustas
  async switchCompany(userId: string, switchDto: SwitchCompanyDto) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: switchDto.companyId,
        company: { isActive: true },
      },
      include: {
        company: { select: { id: true, name: true, cnpj: true, isActive: true } },
        sector: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, isActive: true } },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('Usuario nao tem acesso valido a esta empresa');
    }

    if (!userCompany.user.isActive) {
      throw new ForbiddenException('Usuario inativo');
    }

    const [updatedUserCompany, allUserCompanies] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.userCompany.update({
        where: { id: userCompany.id },
        data: { lastAccessedAt: new Date() },
        include: {
          company: { select: { id: true, name: true, cnpj: true } },
          sector: { select: { id: true, name: true } },
        },
      });

      const all = await tx.userCompany.findMany({
        where: {
          userId,
          company: { isActive: true },
        },
        include: {
          company: { select: { id: true, name: true, cnpj: true } },
          sector: { select: { id: true, name: true } },
        },
        orderBy: [
          { isDefault: 'desc' },
          { lastAccessedAt: 'desc' },
        ],
      });

      return [updated, all];
    });

    const resolvedPermissions = await this.profilesService.resolveUserPermissions(
      userId,
      switchDto.companyId,
    );

    const payload = {
      sub: userId,
      email: userCompany.user.email,
      companyId: switchDto.companyId,
      role: userCompany.role,
      profiles: resolvedPermissions.profileIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userCompany.user.id,
        name: userCompany.user.name,
        email: userCompany.user.email,
        activeCompany: {
          id: updatedUserCompany.company.id,
          companyId: updatedUserCompany.companyId,
          name: updatedUserCompany.company.name,
          role: updatedUserCompany.role,
          sector: updatedUserCompany.sector,
          isDefault: updatedUserCompany.isDefault,
          profileIds: resolvedPermissions.profileIds,
        },
        companies: allUserCompanies.map((uc) => ({
          id: uc.id,
          companyId: uc.company.id,
          name: uc.company.name,
          cnpj: uc.company.cnpj,
          role: uc.role,
          sector: uc.sector,
          isDefault: uc.isDefault,
          lastAccessedAt: uc.lastAccessedAt,
        })),
        permissions: resolvedPermissions.permissions,
        processTypePermissions: resolvedPermissions.processTypes,
        profileIds: resolvedPermissions.profileIds,
      },
    };
  }

  //    Verificar permissoes com validacao de empresa ativa
  async checkUserPermissions(userId: string, companyId: string) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId,
        company: { isActive: true },
        user: { isActive: true },
      },
      include: {
        company: true,
        sector: true,
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('Usuario nao tem acesso valido a esta empresa');
    }

    const resolvedPermissions = await this.profilesService.resolveUserPermissions(
      userId,
      companyId,
    );

    return {
      role: userCompany.role,
      company: userCompany.company,
      sector: userCompany.sector,
      permissions: resolvedPermissions.permissions,
      processTypePermissions: resolvedPermissions.processTypes,
      profileIds: resolvedPermissions.profileIds,
    };
  }

  //    Validar contexto de empresa em requests
  async validateCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId,
        company: { isActive: true },
        user: { isActive: true },
      },
    });

    return !!userCompany;
  }

  async refreshToken(user: any) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
        user: { isActive: true },
        company: { isActive: true },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
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

    if (!userCompany) {
      throw new UnauthorizedException('Usuário ou empresa inativos');
    }

    const resolvedPermissions = await this.profilesService.resolveUserPermissions(
      user.id,
      user.companyId,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: userCompany.role,
      profiles: resolvedPermissions.profileIds,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // REFRESH TOKEN COM REVOGAÇÃO
  // ════════════════════════════════════════════════════════════════════════════════

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  async createRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    // Validar que o userId existe antes de criar o token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    const token = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de validade

    await this.prisma.refreshToken.create({
      data: {
        id: uuidv4(),
        token,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return token;
  }

  async validateRefreshToken(token: string): Promise<{ userId: string } | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return null;
    }

    if (refreshToken.isRevoked) {
      return null;
    }

    if (refreshToken.expiresAt < new Date()) {
      await this.revokeRefreshToken(token);
      return null;
    }

    return { userId: refreshToken.userId };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    return result.count;
  }

  async getActiveTokens(userId: string): Promise<any[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeTokenById(tokenId: string, userId: string): Promise<boolean> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { id: tokenId, userId },
    });

    if (!token) {
      return false;
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return true;
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // RECUPERAÇÃO DE SENHA
  // ════════════════════════════════════════════════════════════════════════════════

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    // Resposta genérica para evitar enumeração de emails
    const genericMessage = 'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.';

    if (!user || !user.isActive) {
      return { message: genericMessage };
    }

    // Invalidar tokens anteriores do mesmo usuário
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Gerar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Enviar email
    try {
      await this.mailerService.sendPasswordResetEmail(user.email, user.name, token);
    } catch (error) {
      this.logger.error(`Falha ao enviar email de recuperação: ${error.message}`);
    }

    return { message: genericMessage };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (!resetToken) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Este link já foi utilizado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expirado. Solicite uma nova recuperação de senha.');
    }

    if (!resetToken.user.isActive) {
      throw new BadRequestException('Usuário inativo');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      // Atualizar senha
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Marcar token como usado
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      // Revogar todas as sessões ativas do usuário
      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      });
    });

    return { message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' };
  }
}















