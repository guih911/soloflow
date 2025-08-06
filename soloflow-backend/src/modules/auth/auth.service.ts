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

    // Buscar empresas do usuário
    const userWithCompanies = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userCompanies: {
          where: { company: { isActive: true } },
          include: {
            company: true,
            sector: true,
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

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currentCompany: {
          id: defaultCompany.company.id,
          name: defaultCompany.company.name,
          role: defaultCompany.role,
          sector: defaultCompany.sector,
        },
        companies: userWithCompanies.userCompanies.map(uc => ({
          id: uc.company.id,
          name: uc.company.name,
          role: uc.role,
          sector: uc.sector,
          isDefault: uc.isDefault,
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

    const user = await this.prisma.$transaction(async (tx) => {
      // Criar usuário
      const newUser = await tx.user.create({
        data: {
          name: registerDto.name,
          email: registerDto.email,
          password: hashedPassword,
        },
      });

      // Criar vínculo com empresa
      await tx.userCompany.create({
        data: {
          userId: newUser.id,
          companyId: registerDto.companyId,
          role: UserRole.USER,
          isDefault: true,
        },
      });

      return newUser;
    });

    const payload = {
      sub: user.id,
      email: user.email,
      companyId: registerDto.companyId,
      role: UserRole.USER,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currentCompany: {
          id: company.id,
          name: company.name,
          role: UserRole.USER,
        },
      },
    };
  }

  async switchCompany(userId: string, switchDto: SwitchCompanyDto) {
    // Verificar se usuário tem acesso à empresa
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: switchDto.companyId,
        company: { isActive: true },
      },
      include: {
        company: true,
        sector: true,
      },
    });

    if (!userCompany) {
      throw new UnauthorizedException('Acesso negado a esta empresa');
    }

    // Atualizar último acesso
    await this.prisma.userCompany.update({
      where: { id: userCompany.id },
      data: { lastAccessedAt: new Date() },
    });

    const payload = {
      sub: userId,
      email: userCompany.company.email,
      companyId: userCompany.companyId,
      role: userCompany.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      company: {
        id: userCompany.company.id,
        name: userCompany.company.name,
        role: userCompany.role,
        sector: userCompany.sector,
      },
    };
  }
}
