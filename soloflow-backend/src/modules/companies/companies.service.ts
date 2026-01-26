import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  private sanitizeDigits(value?: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    return digits.length ? digits : null;
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const sanitizedCnpj = this.sanitizeDigits(createCompanyDto.cnpj);
    const sanitizedPhone = this.sanitizeDigits(createCompanyDto.phone);

    if (!sanitizedCnpj || sanitizedCnpj.length !== 14) {
      throw new ConflictException('CNPJ deve conter 14 dígitos válidos');
    }

    const existingCompany = await this.prisma.company.findUnique({
      where: { cnpj: sanitizedCnpj },
    });

    if (existingCompany) {
      throw new ConflictException('Empresa com este CNPJ já existe');
    }

    const existingName = await this.prisma.company.findUnique({
      where: { name: createCompanyDto.name },
    });

    if (existingName) {
      throw new ConflictException('Empresa com este nome já existe');
    }

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          ...createCompanyDto,
          cnpj: sanitizedCnpj,
          phone: sanitizedPhone,
        },
      });

      await this.createDefaultProfiles(tx, company.id);

      return company;
    });
  }

  private async createDefaultProfiles(tx: any, companyId: string) {
    const profiles = [
      {
        name: 'Super Admin',
        description: 'Perfil com acesso total ao sistema',
        permissions: [
          { resource: '*', action: '*' },
          { resource: 'dashboard', action: 'view' },
          { resource: 'processes', action: 'view' },
          { resource: 'processes', action: 'create' },
          { resource: 'processes', action: 'edit' },
          { resource: 'processes', action: 'delete' },
          { resource: 'processes', action: 'manage' },
          { resource: 'tasks', action: 'view' },
          { resource: 'tasks', action: 'execute' },
          { resource: 'tasks', action: 'reassign' },
          { resource: 'users', action: 'view' },
          { resource: 'users', action: 'create' },
          { resource: 'users', action: 'edit' },
          { resource: 'users', action: 'delete' },
          { resource: 'users', action: 'manage' },
          { resource: 'profiles', action: 'view' },
          { resource: 'profiles', action: 'manage' },
          { resource: 'process_types', action: 'view' },
          { resource: 'process_types', action: 'create' },
          { resource: 'process_types', action: 'edit' },
          { resource: 'process_types', action: 'delete' },
          { resource: 'process_types', action: 'publish' },
          { resource: 'process_types', action: 'manage' },
          { resource: 'companies', action: 'view' },
          { resource: 'companies', action: 'create' },
          { resource: 'companies', action: 'edit' },
          { resource: 'companies', action: 'delete' },
          { resource: 'companies', action: 'manage' },
          { resource: 'sectors', action: 'view' },
          { resource: 'sectors', action: 'create' },
          { resource: 'sectors', action: 'edit' },
          { resource: 'sectors', action: 'delete' },
          { resource: 'sectors', action: 'manage' },
          { resource: 'settings', action: 'manage' },
          { resource: 'audit', action: 'view' },
          { resource: 'reports', action: 'view' },
          { resource: 'reports', action: 'manage' },
          { resource: 'reports', action: 'export' },
          { resource: 'signatures', action: 'view' },
          { resource: 'signatures', action: 'sign' },
        ],
      },
      {
        name: 'Coordenação',
        description: 'Perfil para coordenação e gestão de processos',
        permissions: [
          { resource: 'dashboard', action: 'view' },
          { resource: 'processes', action: 'view' },
          { resource: 'processes', action: 'create' },
          { resource: 'processes', action: 'edit' },
          { resource: 'processes', action: 'delete' },
          { resource: 'processes', action: 'manage' },
          { resource: 'tasks', action: 'view' },
          { resource: 'tasks', action: 'execute' },
          { resource: 'tasks', action: 'reassign' },
          { resource: 'users', action: 'view' },
          { resource: 'users', action: 'create' },
          { resource: 'users', action: 'edit' },
          { resource: 'profiles', action: 'view' },
          { resource: 'process_types', action: 'view' },
          { resource: 'process_types', action: 'create' },
          { resource: 'process_types', action: 'edit' },
          { resource: 'process_types', action: 'manage' },
          { resource: 'sectors', action: 'view' },
          { resource: 'audit', action: 'view' },
          { resource: 'reports', action: 'view' },
          { resource: 'reports', action: 'export' },
          { resource: 'signatures', action: 'view' },
          { resource: 'signatures', action: 'sign' },
          { resource: 'settings', action: 'manage' },
        ],
      },
      {
        name: 'Analista',
        description: 'Perfil para análise e execução de processos',
        permissions: [
          { resource: 'dashboard', action: 'view' },
          { resource: 'processes', action: 'view' },
          { resource: 'processes', action: 'create' },
          { resource: 'tasks', action: 'view' },
          { resource: 'tasks', action: 'execute' },
          { resource: 'users', action: 'view' },
          { resource: 'sectors', action: 'view' },
          { resource: 'reports', action: 'view' },
          { resource: 'signatures', action: 'view' },
          { resource: 'signatures', action: 'sign' },
        ],
      },
    ];

    for (const profileData of profiles) {
      const profileId = randomUUID();
      await tx.profiles.create({
        data: {
          id: profileId,
          name: profileData.name,
          description: profileData.description,
          companyId,
          isActive: true,
          isDefault: profileData.name === 'Analista',
          updatedAt: new Date(),
        },
      });

      if (profileData.permissions.length > 0) {
        await tx.profile_permissions.createMany({
          data: profileData.permissions.map((perm) => ({
            id: randomUUID(),
            profileId,
            resource: perm.resource,
            action: perm.action,
          })),
        });
      }
    }
  }

  async findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            userCompanies: {
              where: {
                user: {
                  isActive: true,
                },
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<Company & { users: any[] }> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        userCompanies: {
          where: { user: { isActive: true } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const users = company.userCompanies.map((uc) => ({
      ...uc.user,
      role: uc.role, // Role da UserCompany
    }));

    return {
      ...company,
      users,
    };
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    await this.findOne(id);

    const sanitizedCnpj = this.sanitizeDigits(updateCompanyDto.cnpj);
    const sanitizedPhone = this.sanitizeDigits(updateCompanyDto.phone);

    if (sanitizedCnpj && sanitizedCnpj.length !== 14) {
      throw new ConflictException('CNPJ deve conter 14 dígitos válidos');
    }

    if (sanitizedCnpj) {
      const existing = await this.prisma.company.findFirst({
        where: {
          cnpj: sanitizedCnpj,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('CNPJ já está em uso');
      }
    }

    if (updateCompanyDto.name) {
      const existing = await this.prisma.company.findFirst({
        where: {
          name: updateCompanyDto.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Nome já está em uso');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        ...updateCompanyDto,
        ...(sanitizedCnpj ? { cnpj: sanitizedCnpj } : {}),
        ...(updateCompanyDto.phone !== undefined ? { phone: sanitizedPhone } : {}),
      },
    });
  }

  async remove(id: string): Promise<Company> {
    await this.findOne(id);

    return this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
