import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignProfileDto } from './dto/assign-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(req.user.companyId, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.profilesService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.profilesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.profilesService.remove(id, req.user.companyId);
  }

  /**
   * Adiciona um perfil a um usuário (permite múltiplos perfis)
   */
  @Post(':id/add-user')
  addToUser(@Request() req, @Param('id') id: string, @Body() dto: AssignProfileDto) {
    return this.profilesService.addProfile(id, dto.userId, req.user.companyId, dto.assignedBy ?? req.user.sub);
  }

  /**
   * Remove um perfil específico de um usuário
   */
  @Delete(':id/remove-user/:userId')
  removeFromUser(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.profilesService.removeProfile(id, userId, req.user.companyId);
  }

  /**
   * Atribui perfil (compatibilidade - substitui todos os perfis)
   * @deprecated Use POST :id/add-user para adicionar perfis individuais
   */
  @Post(':id/assign')
  assign(@Request() req, @Param('id') id: string, @Body() dto: AssignProfileDto) {
    return this.profilesService.assignProfile(id, dto.userId, req.user.companyId, dto.assignedBy ?? req.user.sub);
  }

  /**
   * Remove todos os perfis de um usuário
   * @deprecated Use DELETE :id/remove-user/:userId para remover perfis individuais
   */
  @Delete(':id/assign/:userId')
  unassign(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.profilesService.removeAssignment(userId, req.user.companyId);
  }

  /**
   * Lista todos os usuários que possuem um perfil
   */
  @Get(':id/users')
  listUsers(@Request() req, @Param('id') id: string) {
    return this.profilesService.listAssignments(id, req.user.companyId);
  }

  /**
   * Lista todos os perfis de um usuário
   */
  @Get('user/:userId/profiles')
  getUserProfiles(@Request() req, @Param('userId') userId: string) {
    return this.profilesService.getUserProfiles(userId, req.user.companyId);
  }
}
