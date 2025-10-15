import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

    return this.prisma.company.create({
      data: {
        ...createCompanyDto,
        cnpj: sanitizedCnpj,
        phone: sanitizedPhone,
      },
    });
  }

  async findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
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
                role: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const users = company.userCompanies.map((uc) => uc.user);

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
