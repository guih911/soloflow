import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserCompanyDto } from './dto/create-user-company.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserCompaniesDto } from './dto/update-user-companies.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() createUserDto: CreateUserCompanyDto, @Request() req) {
    console.log('Creating user with payload:', createUserDto);
    console.log('Request user:', req.user);

    // Se não for admin e não especificou empresas, forçar a empresa do usuário logado
    if (req.user.role !== UserRole.ADMIN) {
      if (!createUserDto.companies || createUserDto.companies.length === 0) {
        // Modo compatibilidade: usar empresa atual do usuário
        createUserDto.companyId = req.user.companyId;
      } else {
        // Modo múltiplas empresas: filtrar apenas empresas que o manager pode gerenciar
        createUserDto.companies = createUserDto.companies.filter(
          company => company.companyId === req.user.companyId
        );
      }
    }

    // Garantir que pelo menos uma empresa está especificada
    if (!createUserDto.companyId && (!createUserDto.companies || createUserDto.companies.length === 0)) {
      createUserDto.companyId = req.user.companyId;
    }

    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(@Request() req, @Query('companyId') companyId?: string) {
    console.log('Finding users for company:', companyId || req.user.companyId);
    
    // Se não for ADMIN, só pode ver usuários da própria empresa
    if (req.user.role !== UserRole.ADMIN) {
      companyId = req.user.companyId;
    }

    // Se companyId ainda não está definido, usar da sessão
    if (!companyId) {
      companyId = req.user.companyId;
    }

    return this.usersService.findAll(companyId!);
  }

  @Get('me')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/companies')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateUserCompanies(
    @Param('id') id: string, 
    @Body() updateDto: UpdateUserCompaniesDto,
    @Request() req
  ) {
    // Se não for admin, filtrar apenas empresas que o manager pode gerenciar
    if (req.user.role !== UserRole.ADMIN && updateDto.companies) {
      updateDto.companies = updateDto.companies.filter(
        company => company.companyId === req.user.companyId
      );
    }

    return this.usersService.updateUserCompanies(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}