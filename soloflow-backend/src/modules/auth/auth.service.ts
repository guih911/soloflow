import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // ✅ MELHORADO: Buscar empresas do usuário com mais detalhes
    const userWithCompanies = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userCompanies: {
          where: { company: { isActive: true } },
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

    if (!userWithCompanies || !userWithCompanies.userCompanies.length) {
      throw new UnauthorizedException('Usuário não está vinculado a nenhuma empresa ativa');
    }

    // Pegar empresa padrão ou a primeira
    const defaultCompany = userWithCompanies.userCompanies.find(uc => uc.isDefault)
      || userWithCompanies.userCompanies[0];

    // Atualizar último acesso
    await this.prisma.userCompany.update({
      where: { id: defaultCompany.id },
      data: { lastAccessedAt: new Date() },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      companyId: defaultCompany.companyId,
      role: defaultCompany.role,
    };

    // ✅ MELHORADO: Retorno mais completo
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
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // Verificar se empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: registerDto.companyId },
    });

    if (!company || !company.isActive) {
      throw new BadRequestException('Empresa não encontrada ou inativa');
    }

    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email já cadastrado');
    }

    // Criar usuário e vínculo com empresa em transação
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Criar usuário
      const newUser = await tx.user.create({
        data: {
          name: registerDto.name,
          email: registerDto.email,
          password: hashedPassword,
        },
      });

      // Criar vínculo com empresa
      const userCompany = await tx.userCompany.create({
        data: {
          userId: newUser.id,
          companyId: registerDto.companyId,
          role: UserRole.USER,
          isDefault: true,
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
            },
          },
        },
      });

      return { user: newUser, userCompany };
    });

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      companyId: registerDto.companyId,
      role: UserRole.USER,
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
          sector: null,
          isDefault: true,
        },
        companies: [{
          id: result.userCompany.id,
          companyId: result.userCompany.company.id,
          name: result.userCompany.company.name,
          cnpj: result.userCompany.company.cnpj,
          role: result.userCompany.role,
          sector: null,
          isDefault: true,
          lastAccessedAt: new Date(),
        }],
      },
    };
  }

  // ✅ CORRIGIDO: Switch de empresa melhorado
  async switchCompany(userId: string, switchDto: SwitchCompanyDto) {
    // Verificar se usuário tem acesso à empresa
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: switchDto.companyId,
        company: { isActive: true },
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!userCompany) {
      throw new UnauthorizedException('Acesso negado a esta empresa');
    }

    // Atualizar último acesso e buscar todas as empresas
    const [updatedUserCompany, allUserCompanies] = await Promise.all([
      this.prisma.userCompany.update({
        where: { id: userCompany.id },
        data: { lastAccessedAt: new Date() },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
            },
          },
          sector: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.userCompany.findMany({
        where: { 
          userId,
          company: { isActive: true },
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              cnpj: true,
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
      }),
    ]);

    const payload = {
      sub: userId,
      email: userCompany.user.email,
      companyId: switchDto.companyId,
      role: userCompany.role,
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
        },
        companies: allUserCompanies.map(uc => ({
          id: uc.id,
          companyId: uc.company.id,
          name: uc.company.name,
          cnpj: uc.company.cnpj,
          role: uc.role,
          sector: uc.sector,
          isDefault: uc.isDefault,
          lastAccessedAt: uc.lastAccessedAt,
        })),
      },
    };
  }

  // ✅ NOVO: Refresh token para manter sessão
  async refreshToken(userId: string) {
    const userWithCompanies = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userCompanies: {
          where: { company: { isActive: true } },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                cnpj: true,
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
            { lastAccessedAt: 'desc' },
          ],
        },
      },
    });

    if (!userWithCompanies || !userWithCompanies.userCompanies.length) {
      throw new UnauthorizedException('Usuário não tem empresas ativas');
    }

    const activeCompany = userWithCompanies.userCompanies[0];

    const payload = {
      sub: userId,
      email: userWithCompanies.email,
      companyId: activeCompany.companyId,
      role: activeCompany.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userWithCompanies.id,
        name: userWithCompanies.name,
        email: userWithCompanies.email,
        activeCompany: {
          id: activeCompany.company.id,
          companyId: activeCompany.companyId,
          name: activeCompany.company.name,
          role: activeCompany.role,
          sector: activeCompany.sector,
          isDefault: activeCompany.isDefault,
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
      },
    };
  }

  // ✅ NOVO: Verificar permissões
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
      throw new UnauthorizedException('Usuário não tem acesso a esta empresa');
    }

    return {
      role: userCompany.role,
      company: userCompany.company,
      sector: userCompany.sector,
      permissions: this.getRolePermissions(userCompany.role),
    };
  }

  private getRolePermissions(role: UserRole) {
    const permissions = {
      ADMIN: [
        'manage_companies',
        'manage_users',
        'manage_sectors',
        'manage_process_types',
        'manage_processes',
        'view_all_processes',
        'execute_any_step',
      ],
      MANAGER: [
        'manage_users',
        'manage_sectors',
        'manage_process_types',
        'view_company_processes',
        'execute_assigned_steps',
      ],
      USER: [
        'create_processes',
        'view_own_processes',
        'execute_assigned_steps',
      ],
    };

    return permissions[role] || [];
  }
}