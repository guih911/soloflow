import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { Sector } from '@prisma/client';

@Injectable()
export class SectorsService {
  private readonly logger = new Logger(SectorsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createSectorDto: CreateSectorDto): Promise<Sector> {

    // Verificar se a empresa existe e está ativa
    const company = await this.prisma.company.findUnique({
      where: { id: createSectorDto.companyId },
    });

    if (!company || !company.isActive) {
      throw new BadRequestException('Empresa não encontrada ou inativa');
    }

    // Verificar se já existe setor com mesmo nome na empresa
    const existing = await this.prisma.sector.findFirst({
      where: {
        name: createSectorDto.name,
        companyId: createSectorDto.companyId,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException('Setor com este nome já existe nesta empresa');
    }

    try {
      return await this.prisma.sector.create({
        data: {
          ...createSectorDto,
          description: createSectorDto.description || undefined, // ✅ null -> undefined
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Erro ao criar setor', error.stack);
      throw new BadRequestException('Erro ao criar setor: ' + error.message);
    }
  }

  async findAll(companyId: string): Promise<any[]> {
    if (!companyId) {
      throw new BadRequestException('ID da empresa é obrigatório');
    }

    const sectors = await this.prisma.sector.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        _count: {
          select: { 
            userCompanies: {
              where: {
                companyId: companyId,
              }
            }
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return sectors.map(sector => ({
      ...sector,
      _count: {
        users: sector._count.userCompanies,
      },
    }));
  }

  async findOne(id: string): Promise<any> {
    const sector = await this.prisma.sector.findUnique({
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
        company: true,
      },
    });

    if (!sector) {
      throw new NotFoundException('Setor não encontrado');
    }

    // Transformar para formato esperado
    return {
      ...sector,
      users: sector.userCompanies.map(uc => ({
        id: uc.user.id,
        name: uc.user.name,
        email: uc.user.email,
        role: uc.role,
      })),
    };
  }

  async update(id: string, updateSectorDto: UpdateSectorDto): Promise<Sector> {
    const sector = await this.findOne(id);

    // Se está atualizando nome, verificar duplicidade na mesma empresa
    if (updateSectorDto.name && updateSectorDto.name !== sector.name) {
      const existing = await this.prisma.sector.findFirst({
        where: {
          name: updateSectorDto.name,
          companyId: sector.companyId,
          isActive: true,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Nome já está em uso nesta empresa');
      }
    }

    try {
      return await this.prisma.sector.update({
        where: { id },
        data: {
          ...updateSectorDto,
          description: updateSectorDto.description || undefined, // ✅ null -> undefined
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('Erro ao atualizar setor', error.stack);
      throw new BadRequestException('Erro ao atualizar setor: ' + error.message);
    }
  }

  async remove(id: string): Promise<Sector> {
    const sector = await this.findOne(id);

    // Verificar se há usuários no setor
    const usersCount = await this.prisma.userCompany.count({
      where: { 
        sectorId: id,
        companyId: sector.companyId,
      },
    });

    if (usersCount > 0) {
      throw new BadRequestException('Não é possível remover setor com usuários');
    }

    // Soft delete
    return this.prisma.sector.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addUserToSector(userId: string, sectorId: string, companyId: string): Promise<void> {
    const sector = await this.findOne(sectorId);

    // Verificar se o usuário tem vínculo com a empresa do setor
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId: sector.companyId,
      },
    });

    if (!userCompany) {
      throw new BadRequestException('Usuário não está vinculado à empresa do setor');
    }

    if (userCompany.companyId !== sector.companyId) {
      throw new BadRequestException('Usuário e setor devem ser da mesma empresa');
    }

    await this.prisma.userCompany.update({
      where: {
        userId_companyId: {
          userId,
          companyId: sector.companyId,
        },
      },
      data: { sectorId },
    });
  }

  async removeUserFromSector(userId: string, companyId: string): Promise<void> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId,
        companyId,
      },
    });

    if (!userCompany) {
      throw new NotFoundException('Vínculo do usuário com a empresa não encontrado');
    }

    await this.prisma.userCompany.update({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      data: { sectorId: null },
    });
  }
}