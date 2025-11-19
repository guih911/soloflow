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
import { ResetPasswordDto, ChangePasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Criar usuário - ADMIN pode criar em qualquer empresa, MANAGER apenas na sua
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(@Body() createUserDto: CreateUserCompanyDto, @Request() req) {
    console.log('Creating user with payload:', createUserDto);
    console.log('Request user:', req.user);

    // MANAGER: Restringir à empresa do usuário logado
    const isAdmin = req.user.role === UserRole.ADMIN;
    if (!isAdmin) {
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

    return this.usersService.create(createUserDto, req.user.sub);
  }

  /**
   * Listar usuários - ADMIN pode ver todas empresas, MANAGER apenas a sua
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async findAll(@Request() req, @Query('companyId') companyId?: string) {
    console.log('Finding users for company:', companyId || req.user.companyId);

    // MANAGER/USER: Restringir à própria empresa
    const isAdmin = req.user.role === UserRole.ADMIN;
    if (!isAdmin) {
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

  /**
   * Atualizar empresas do usuário - ADMIN pode atribuir qualquer empresa, MANAGER apenas a sua
   */
  @Patch(':id/companies')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateUserCompanies(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserCompaniesDto,
    @Request() req
  ) {
    // MANAGER: Filtrar apenas empresas que pode gerenciar
    const isAdmin = req.user.role === UserRole.ADMIN;
    if (!isAdmin && updateDto.companies) {
      updateDto.companies = updateDto.companies.filter(
        company => company.companyId === req.user.companyId
      );
    }

    return this.usersService.updateUserCompanies(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  /**
   * Reset de senha (apenas ADMIN pode resetar senha de outros usuários)
   */
  @Patch(':id/reset-password')
  @Roles(UserRole.ADMIN)
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.usersService.resetPassword(id, dto.newPassword);
    return { message: 'Senha resetada com sucesso' };
  }

  /**
   * Troca de senha (qualquer usuário pode trocar sua própria senha)
   */
  @Patch('me/change-password')
  async changePassword(
    @Request() req,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Senha alterada com sucesso' };
  }
}