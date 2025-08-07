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

    // Se não for admin, forçar a empresa do usuário logado
    if (req.user.role !== UserRole.ADMIN) {
      createUserDto.companyId = req.user.companyId;
    }

    // Garantir que companyId está definido
    if (!createUserDto.companyId) {
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

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}