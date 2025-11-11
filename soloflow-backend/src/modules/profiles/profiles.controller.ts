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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
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

  @Post(':id/assign')
  assign(@Request() req, @Param('id') id: string, @Body() dto: AssignProfileDto) {
    return this.profilesService.assignProfile(id, dto.userId, req.user.companyId, dto.assignedBy ?? req.user.sub);
  }

  @Delete(':id/assign/:userId')
  unassign(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.profilesService.removeAssignment(userId, req.user.companyId);
  }

  @Get(':id/users')
  listUsers(@Request() req, @Param('id') id: string) {
    return this.profilesService.listAssignments(id, req.user.companyId);
  }
}
