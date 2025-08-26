// src/modules/users/users.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserCompanyDto, UserCompanyAssignmentDto } from './dto/create-user-company.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserCompaniesDto } from './dto/update-user-companies.dto';
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

    // Determinar quais empresas vincular
    let companiesToAssign: UserCompanyAssignmentDto[] = [];

    if (createUserDto.companies && createUserDto.companies.length > 0) {
      // Modo novo: múltiplas empresas
      companiesToAssign = createUserDto.companies;
    } else if (createUserDto.companyId) {
      // Modo compatibilidade: uma empresa
      companiesToAssign = [{
        companyId: createUserDto.companyId,
        role: createUserDto.role || UserRole.USER,
        sectorId: createUserDto.sectorId,
        isDefault: createUserDto.isDefault ?? true
      }];
    } else {
      throw new BadRequestException('Pelo menos uma empresa deve ser especificada');
    }

    // Validar empresas
    for (const companyAssignment of companiesToAssign) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyAssignment.companyId },
      });

      if (!company || !company.isActive) {
        throw new BadRequestException(`Empresa ${companyAssignment.companyId} não encontrada ou inativa`);
      }

      // Se especificou setor, verificar se existe e pertence à empresa
      if (companyAssignment.sectorId) {
        const sector = await this.prisma.sector.findFirst({
          where: {
            id: companyAssignment.sectorId,
            companyId: companyAssignment.companyId,
            isActive: true,
          },
        });

        if (!sector) {
          throw new BadRequestException(`Setor ${companyAssignment.sectorId} não encontrado ou não pertence à empresa ${companyAssignment.companyId}`);
        }
      }
    }

    // Verificar se há pelo menos uma empresa padrão
    const hasDefault = companiesToAssign.some(c => c.isDefault);
    if (!hasDefault && companiesToAssign.length > 0) {
      companiesToAssign[0].isDefault = true;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    try {
      // Criar usuário e vínculos com empresas em transação
      const result = await this.prisma.$transaction(async (tx) => {
        // Criar usuário
        const user = await tx.user.create({
          data: {
            name: createUserDto.name,
            email: createUserDto.email,
            password: hashedPassword,
          },
        });

        console.log('User created:', user);

        // Criar vínculos com empresas
        const userCompanies = await Promise.all(
          companiesToAssign.map(companyAssignment =>
            tx.userCompany.create({
              data: {
                userId: user.id,
                companyId: companyAssignment.companyId,
                role: companyAssignment.role || UserRole.USER,
                sectorId: companyAssignment.sectorId || undefined,
                isDefault: companyAssignment.isDefault ?? false,
              },
              include: {
                company: true,
                sector: true,
              },
            })
          )
        );

        console.log('UserCompanies created:', userCompanies);

        return {
          ...user,
          companies: userCompanies.map(uc => ({
            companyId: uc.company.id,
            companyName: uc.company.name,
            role: uc.role,
            sector: uc.sector,
            isDefault: uc.isDefault,
          })),
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
        user: {
          include: {
            userCompanies: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                  }
                },
                sector: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        },
        sector: true,
      },
      orderBy: { user: { name: 'asc' } },
    });

    return userCompanies.map(uc => ({
      id: uc.user.id,
      name: uc.user.name,
      email: uc.user.email,
      role: uc.role, // Role na empresa atual
      sector: uc.sector,
      isActive: uc.user.isActive,
      createdAt: uc.user.createdAt,
      // Todas as empresas do usuário
      companies: uc.user.userCompanies.map(userComp => ({
        companyId: userComp.company.id,
        companyName: userComp.company.name,
        role: userComp.role,
        sector: userComp.sector,
        isDefault: userComp.isDefault,
      })),
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
    return {
      ...result,
      companies: user.userCompanies.map(uc => ({
        companyId: uc.company.id,
        companyName: uc.company.name,
        role: uc.role,
        sector: uc.sector,
        isDefault: uc.isDefault,
      })),
    };
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

  async updateUserCompanies(id: string, updateDto: UpdateUserCompaniesDto): Promise<any> {
    const user = await this.findOne(id);
    
    if (!updateDto.companies || updateDto.companies.length === 0) {
      throw new BadRequestException('Pelo menos uma empresa deve ser especificada');
    }

    // Validar empresas
    for (const companyAssignment of updateDto.companies) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyAssignment.companyId },
      });

      if (!company || !company.isActive) {
        throw new BadRequestException(`Empresa ${companyAssignment.companyId} não encontrada ou inativa`);
      }

      if (companyAssignment.sectorId) {
        const sector = await this.prisma.sector.findFirst({
          where: {
            id: companyAssignment.sectorId,
            companyId: companyAssignment.companyId,
            isActive: true,
          },
        });

        if (!sector) {
          throw new BadRequestException(`Setor ${companyAssignment.sectorId} não encontrado ou não pertence à empresa ${companyAssignment.companyId}`);
        }
      }
    }

    // Verificar se há pelo menos uma empresa padrão
    const hasDefault = updateDto.companies.some(c => c.isDefault);
    if (!hasDefault) {
      updateDto.companies[0].isDefault = true;
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Remover vínculos existentes
        await tx.userCompany.deleteMany({
          where: { userId: id },
        });

        // Criar novos vínculos
        const userCompanies = await Promise.all(
          updateDto.companies!.map(companyAssignment =>
            tx.userCompany.create({
              data: {
                userId: id,
                companyId: companyAssignment.companyId,
                role: companyAssignment.role || UserRole.USER,
                sectorId: companyAssignment.sectorId || undefined,
                isDefault: companyAssignment.isDefault ?? false,
              },
              include: {
                company: true,
                sector: true,
              },
            })
          )
        );

        return userCompanies;
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        companies: result.map(uc => ({
          companyId: uc.company.id,
          companyName: uc.company.name,
          role: uc.role,
          sector: uc.sector,
          isDefault: uc.isDefault,
        })),
      };
    } catch (error) {
      console.error('Error updating user companies:', error);
      throw new BadRequestException('Erro ao atualizar empresas do usuário: ' + error.message);
    }
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
        sectorId: assignDto.sectorId || undefined,
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
        sectorId: data.sectorId || undefined,
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