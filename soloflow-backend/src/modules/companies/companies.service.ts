import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Verificar se já existe empresa com mesmo CNPJ
    const existingCompany = await this.prisma.company.findUnique({
      where: { cnpj: createCompanyDto.cnpj },
    });

    if (existingCompany) {
      throw new ConflictException('Empresa com este CNPJ já existe');
    }

    // Verificar se já existe empresa com mesmo nome
    const existingName = await this.prisma.company.findUnique({
      where: { name: createCompanyDto.name },
    });

    if (existingName) {
      throw new ConflictException('Empresa com este nome já existe');
    }

    return this.prisma.company.create({
      data: createCompanyDto,
    });
  }

  async findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    await this.findOne(id); // Verifica se existe

    // Se está atualizando CNPJ, verificar duplicidade
    if (updateCompanyDto.cnpj) {
      const existing = await this.prisma.company.findFirst({
        where: {
          cnpj: updateCompanyDto.cnpj,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('CNPJ já está em uso');
      }
    }

    // Se está atualizando nome, verificar duplicidade
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
      data: updateCompanyDto,
    });
  }

  async remove(id: string): Promise<Company> {
    await this.findOne(id);

    // Soft delete - apenas marca como inativo
    return this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });
  }
}