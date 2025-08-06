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
} from '@nestjs/common';
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sectors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createSectorDto: CreateSectorDto, @Request() req) {
    // Se não for admin, forçar a empresa do usuário
    if (req.user.role !== UserRole.ADMIN) {
      createSectorDto.companyId = req.user.companyId;
    }
    return this.sectorsService.create(createSectorDto);
  }

  @Get()
  findAll(@Request() req) {
    // Listar apenas setores da empresa do usuário
    const companyId = req.user.companyId;
    return this.sectorsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sectorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateSectorDto: UpdateSectorDto) {
    return this.sectorsService.update(id, updateSectorDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.sectorsService.remove(id);
  }

  @Post(':id/users/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  addUser(
    @Param('id') sectorId: string,
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.sectorsService.addUserToSector(userId, sectorId, req.user.companyId);
  }

  @Delete(':id/users/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeUser(
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.sectorsService.removeUserFromSector(userId, req.user.companyId);
  }
}
