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

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Criar usuário
   */
  @Post()
  async create(@Body() createUserDto: CreateUserCompanyDto, @Request() req) {
    console.log('Creating user with payload:', createUserDto);
    console.log('Request user:', req.user);

    // Garantir que pelo menos uma empresa está especificada
    if (!createUserDto.companyId && (!createUserDto.companies || createUserDto.companies.length === 0)) {
      createUserDto.companyId = req.user.companyId;
    }

    return this.usersService.create(createUserDto, req.user.sub);
  }

  /**
   * Listar usuários
   */
  @Get()
  async findAll(@Request() req, @Query('companyId') companyId?: string) {
    console.log('Finding users for company:', companyId || req.user.companyId);

    // Se companyId não está definido, usar da sessão
    if (!companyId) {
      companyId = req.user.companyId;
    }

    return this.usersService.findAll(companyId!);
  }

  @Get('me')
  getProfile(@Request() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('me')
  updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    // Usuário só pode atualizar seu próprio perfil (nome, cpf, phone)
    const allowedFields = {
      name: updateUserDto.name,
      cpf: updateUserDto.cpf,
      phone: updateUserDto.phone,
    };
    // Remover campos undefined
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });
    return this.usersService.update(req.user.id, allowedFields);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Atualizar empresas do usuário
   */
  @Patch(':id/companies')
  async updateUserCompanies(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserCompaniesDto,
    @Request() req
  ) {
    return this.usersService.updateUserCompanies(id, updateDto, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  /**
   * Reset de senha
   */
  @Patch(':id/reset-password')
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