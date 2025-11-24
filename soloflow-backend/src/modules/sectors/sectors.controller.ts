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

@Controller('sectors')
@UseGuards(JwtAuthGuard)
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  /**
   * Criar setor
   */
  @Post()
  create(@Body() createSectorDto: CreateSectorDto, @Request() req) {
    console.log('Creating sector with payload:', createSectorDto);
    console.log('Request user:', req.user);

    // Garantir que companyId está definido
    if (!createSectorDto.companyId) {
      createSectorDto.companyId = req.user.companyId;
    }

    return this.sectorsService.create(createSectorDto);
  }

  @Get()
  findAll(@Request() req) {
    console.log('Finding sectors for company:', req.user.companyId);
    
    // Listar apenas setores da empresa do usuário
    const companyId = req.user.companyId;
    return this.sectorsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sectorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSectorDto: UpdateSectorDto) {
    return this.sectorsService.update(id, updateSectorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sectorsService.remove(id);
  }

  @Post(':id/users/:userId')
  addUser(
    @Param('id') sectorId: string,
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.sectorsService.addUserToSector(userId, sectorId, req.user.companyId);
  }

  @Delete(':id/users/:userId')
  removeUser(
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.sectorsService.removeUserFromSector(userId, req.user.companyId);
  }
}