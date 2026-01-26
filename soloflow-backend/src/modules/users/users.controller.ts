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
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserCompanyDto } from './dto/create-user-company.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserCompaniesDto } from './dto/update-user-companies.dto';
import { ResetPasswordDto, ChangePasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CheckScope } from '../auth/decorators/check-scope.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Criar usuário
   */
  @Post()
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'users', action: 'create' })
  async create(@Body() createUserDto: CreateUserCompanyDto, @Request() req) {
    if (!createUserDto.companyId && (!createUserDto.companies || createUserDto.companies.length === 0)) {
      createUserDto.companyId = req.user.companyId;
    }

    return this.usersService.create(createUserDto, req.user.sub);
  }

  /**
   * Listar usuários
   */
  @Get()
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'users', action: 'view' })
  async findAll(@Request() req, @Query('companyId') companyId?: string) {
    // Força uso do companyId do token para evitar vazamento multi-tenant
    const effectiveCompanyId = req.user.companyId;
    if (!effectiveCompanyId) {
      throw new ForbiddenException('Contexto de empresa não definido');
    }

    return this.usersService.findAll(effectiveCompanyId);
  }

  @Get('me')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id, undefined, req.user.id);
  }

  @Patch('me')
  updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    // Usuário só pode atualizar seu próprio nome
    const allowedFields: any = {};
    if (updateUserDto.name !== undefined) {
      allowedFields.name = updateUserDto.name;
    }
    return this.usersService.update(req.user.id, allowedFields);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user.companyId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'users', action: 'edit' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    if (!req.user.companyId) {
      throw new ForbiddenException('Contexto de empresa não definido');
    }
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Atualizar empresas do usuário
   */
  @Patch(':id/companies')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'users', action: 'edit' })
  async updateUserCompanies(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserCompaniesDto,
    @Request() req
  ) {
    if (!req.user.companyId) {
      throw new ForbiddenException('Contexto de empresa não definido');
    }
    return this.usersService.updateUserCompanies(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'users', action: 'delete' })
  remove(@Param('id') id: string, @Request() req) {
    if (id === req.user.id) {
      throw new ForbiddenException('Não é possível remover o próprio usuário');
    }
    return this.usersService.remove(id);
  }

  /**
   * Reset de senha (requer permissão users:manage)
   */
  @Patch(':id/reset-password')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'users', action: 'manage' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Request() req,
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