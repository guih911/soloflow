import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserCompanyDto } from './dto/create-user-company.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserCompanyDto } from './dto/assign-user-company.dto';
import { User, UserCompany, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserCompanyDto): Promise<any> {
    console.log('Creating user with data:', createUserDto);

    // Verificar se email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    // Verificar se a empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: createUserDto.companyId },
    });

    if (!company || !company.isActive) {
      throw new BadRequestException('Empresa não encontrada ou inativa');
    }

    // Se especificou setor, verificar se existe e pertence à empresa
    if (createUserDto.sectorId) {
      const sector = await this.prisma.sector.findFirst({
        where: {
          id: createUserDto.sectorId,
          companyId: createUserDto.companyId,
          isActive: true,
        },
      });

      if (!sector) {
        throw new BadRequestException('Setor não encontrado ou não pertence à empresa');
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    try {
      // Criar usuário e vínculo com empresa em transação
      const result = await this.prisma.$transaction(async (tx) => {
        // Criar usuário (sem role global)
        const user = await tx.user.create({
          data: {
            name: createUserDto.name,
            email: createUserDto.email,
            password: hashedPassword,
            // Removido: role global
          },
        });

        console.log('User created:', user);

        // Criar vínculo com empresa
        const userCompany = await tx.userCompany.create({
          data: {
            userId: user.id,
            companyId: createUserDto.companyId,
            role: createUserDto.role || UserRole.USER,
            sectorId: createUserDto.sectorId || undefined, // ✅ null -> undefined
            isDefault: createUserDto.isDefault ?? true,
          },
          include: {
            company: true,
            sector: true,
          },
        });

        console.log('UserCompany created:', userCompany);

        return {
          ...user,
          company: userCompany.company,
          role: userCompany.role,
          sector: userCompany.sector,
        };
      });

      // Remover senha do retorno
      const { password, ...userWithoutPassword } = result;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new BadRequestException('Erro ao criar usuário: ' + error.message);
    }
  }

  async findAll(companyId: string): Promise<any[]> {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }

    const userCompanies = await this.prisma.userCompany.findMany({
      where: {
        companyId,
        user: { isActive: true },
      },
      include: {
        user: true,
        sector: true,
      },
      orderBy: { user: { name: 'asc' } },
    });

    return userCompanies.map(uc => ({
      id: uc.user.id,
      name: uc.user.name,
      email: uc.user.email,
      role: uc.role, // Role vem do UserCompany
      sector: uc.sector,
      isActive: uc.user.isActive,
      createdAt: uc.user.createdAt,
    }));
  }

  async findOne(id: string, companyId?: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userCompanies: {
          where: companyId ? { companyId } : undefined,
          include: {
            company: true,
            sector: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { password, ...result } = user;
    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    const { password, ...result } = user;
    return result;
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async assignUserToCompany(assignDto: AssignUserCompanyDto): Promise<UserCompany> {
    // Verificar se usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: assignDto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: assignDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Verificar se já existe vínculo
    const existingLink = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: assignDto.userId,
          companyId: assignDto.companyId,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException('Usuário já está vinculado a esta empresa');
    }

    // Se especificou setor, verificar se existe e pertence à empresa
    if (assignDto.sectorId) {
      const sector = await this.prisma.sector.findFirst({
        where: {
          id: assignDto.sectorId,
          companyId: assignDto.companyId,
        },
      });

      if (!sector) {
        throw new BadRequestException('Setor não encontrado ou não pertence à empresa');
      }
    }

    // Se é o primeiro vínculo, definir como padrão
    const userCompanyCount = await this.prisma.userCompany.count({
      where: { userId: assignDto.userId },
    });

    return this.prisma.userCompany.create({
      data: {
        userId: assignDto.userId,
        companyId: assignDto.companyId,
        role: assignDto.role,
        sectorId: assignDto.sectorId || undefined, // ✅ null -> undefined
        isDefault: assignDto.isDefault ?? userCompanyCount === 0,
      },
      include: {
        company: true,
        sector: true,
      },
    });
  }

  async updateUserCompany(
    userId: string,
    companyId: string,
    data: { role?: UserRole; sectorId?: string | null }
  ): Promise<UserCompany> {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    // Se está atualizando setor, verificar se pertence à empresa
    if (data.sectorId !== undefined && data.sectorId !== null) {
      const sector = await this.prisma.sector.findFirst({
        where: {
          id: data.sectorId,
          companyId,
        },
      });

      if (!sector) {
        throw new BadRequestException('Setor não encontrado ou não pertence à empresa');
      }
    }

    return this.prisma.userCompany.update({
      where: {
        userId_companyId: { userId, companyId },
      },
      data: {
        ...data,
        sectorId: data.sectorId || undefined, // ✅ null -> undefined
      },
      include: {
        company: true,
        sector: true,
      },
    });
  }

  async removeUserFromCompany(userId: string, companyId: string): Promise<void> {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    // Verificar se não é o único vínculo
    const count = await this.prisma.userCompany.count({
      where: { userId },
    });

    if (count === 1) {
      throw new BadRequestException('Usuário deve estar vinculado a pelo menos uma empresa');
    }

    await this.prisma.userCompany.delete({
      where: {
        userId_companyId: { userId, companyId },
      },
    });
  }
}