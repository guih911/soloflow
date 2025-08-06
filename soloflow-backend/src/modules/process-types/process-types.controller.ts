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
import { ProcessTypesService } from './process-types.service';
import { CreateProcessTypeDto } from './dto/create-process-type.dto';
import { UpdateProcessTypeDto } from './dto/update-process-type.dto';
import { CreateStepDto } from './dto/create-step.dto';
import { CreateFormFieldDto } from './dto/create-form-field.dto';
import { UpdateFormFieldDto } from './dto/update-form-field.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('process-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessTypesController {
  constructor(private readonly processTypesService: ProcessTypesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Body() createDto: CreateProcessTypeDto, @Request() req) {
    // Se não for admin, forçar a empresa do usuário
    if (req.user.role !== UserRole.ADMIN) {
      createDto.companyId = req.user.companyId;
    }
    return this.processTypesService.create(createDto);
  }

  @Get()
  findAll(@Request() req) {
    const companyId = req.user.companyId;
    return this.processTypesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processTypesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateDto: UpdateProcessTypeDto) {
    return this.processTypesService.update(id, updateDto);
  }

  // Endpoints para gerenciar campos de formulário
  @Post(':id/form-fields')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  addFormField(@Param('id') id: string, @Body() createFormFieldDto: CreateFormFieldDto) {
    return this.processTypesService.addFormField(id, createFormFieldDto);
  }

  @Patch('form-fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateFormField(@Param('fieldId') fieldId: string, @Body() updateFormFieldDto: UpdateFormFieldDto) {
    return this.processTypesService.updateFormField(fieldId, updateFormFieldDto);
  }

  @Delete('form-fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  removeFormField(@Param('fieldId') fieldId: string) {
    return this.processTypesService.removeFormField(fieldId);
  }

  // Endpoints para gerenciar etapas
  @Post(':id/steps')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  addStep(@Param('id') id: string, @Body() createStepDto: CreateStepDto) {
    return this.processTypesService.addStep(id, createStepDto);
  }

  @Patch('steps/:stepId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateStep(@Param('stepId') stepId: string, @Body() updateStepDto: Partial<CreateStepDto>) {
    return this.processTypesService.updateStep(stepId, updateStepDto);
  }

  @Delete('steps/:stepId')
  @Roles(UserRole.ADMIN)
  removeStep(@Param('stepId') stepId: string) {
    return this.processTypesService.removeStep(stepId);
  }
}