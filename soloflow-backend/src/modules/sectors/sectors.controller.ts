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
  ForbiddenException,
} from '@nestjs/common';
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { CheckScope } from '../auth/decorators/check-scope.decorator';

@Controller('sectors')
@UseGuards(JwtAuthGuard)
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  /**
   * Criar setor
   */
  @Post()
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'sectors', action: 'create' })
  create(@Body() createSectorDto: CreateSectorDto, @Request() req) {
    if (!createSectorDto.companyId) {
      createSectorDto.companyId = req.user.companyId;
    }

    return this.sectorsService.create(createSectorDto);
  }

  @Get()
  findAll(@Request() req) {
    const companyId = req.user.companyId;
    if (!companyId) {
      throw new ForbiddenException('Contexto de empresa não definido');
    }
    return this.sectorsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sectorsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'sectors', action: 'update' })
  update(@Param('id') id: string, @Body() updateSectorDto: UpdateSectorDto) {
    return this.sectorsService.update(id, updateSectorDto);
  }

  @Delete(':id')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'sectors', action: 'delete' })
  remove(@Param('id') id: string) {
    return this.sectorsService.remove(id);
  }

  @Post(':id/users/:userId')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'sectors', action: 'update' })
  addUser(
    @Param('id') sectorId: string,
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.sectorsService.addUserToSector(userId, sectorId, req.user.companyId);
  }

  @Delete(':id/users/:userId')
  @UseGuards(ScopeGuard)
  @CheckScope({ resource: 'sectors', action: 'update' })
  removeUser(
    @Param('userId') userId: string,
    @Request() req
  ) {
    return this.sectorsService.removeUserFromSector(userId, req.user.companyId);
  }
}