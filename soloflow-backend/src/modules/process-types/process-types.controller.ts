import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
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

// Definir interfaces para compatibilidade
interface FormField {
  id: string;
  name: string;
  label: string;
  type: any;
  placeholder?: string | null;
  required: boolean;
  order: number;
  options?: any;
  validations?: any;
  defaultValue?: string | null;
  helpText?: string | null;
}

interface Step {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  slaHours?: number | null;
  type: any;
  order: number;
  allowAttachment: boolean;
  requiresSignature: boolean;
  requireAttachment: boolean;
  minAttachments?: number | null;
  maxAttachments?: number | null;
  allowedFileTypes?: any;
  conditions?: any;
  actions?: any;
  assignedToUserId?: string | null;
  assignedToSectorId?: string | null;
  assignedToUser?: any;
  assignedToSector?: any;
}

@Controller('process-types')
@UseGuards(JwtAuthGuard)
export class ProcessTypesController {
  constructor(private readonly processTypesService: ProcessTypesService) {}

  @Post()
  create(@Body() createProcessTypeDto: CreateProcessTypeDto) {
    return this.processTypesService.create(createProcessTypeDto);
  }

  @Get()
  findAll(@Request() req) {
    const companyId = req.user.companyId || req.user.company?.id;
    return this.processTypesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.processTypesService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProcessTypeDto: UpdateProcessTypeDto) {
    return this.processTypesService.update(id, updateProcessTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.processTypesService.remove(id);
  }

  // Form Fields endpoints
  @Post(':id/form-fields')
  addFormField(
    @Param('id') processTypeId: string,
    @Body() createFormFieldDto: CreateFormFieldDto
  ): Promise<FormField> {
    return this.processTypesService.addFormField(processTypeId, createFormFieldDto);
  }

  @Put('form-fields/:fieldId')
  updateFormField(
    @Param('fieldId') fieldId: string,
    @Body() updateFormFieldDto: UpdateFormFieldDto
  ): Promise<FormField> {
    return this.processTypesService.updateFormField(fieldId, updateFormFieldDto);
  }

  @Delete('form-fields/:fieldId')
  removeFormField(@Param('fieldId') fieldId: string): Promise<void> {
    return this.processTypesService.removeFormField(fieldId);
  }

  // Steps endpoints
  @Post(':id/steps')
  addStep(
    @Param('id') processTypeId: string,
    @Body() createStepDto: CreateStepDto
  ): Promise<Step> {
    return this.processTypesService.addStep(processTypeId, createStepDto);
  }

  @Put('steps/:stepId')
  updateStep(
    @Param('stepId') stepId: string,
    @Body() updateStepDto: Partial<CreateStepDto>
  ): Promise<Step> {
    return this.processTypesService.updateStep(stepId, updateStepDto);
  }

  @Delete('steps/:stepId')
  removeStep(@Param('stepId') stepId: string): Promise<void> {
    return this.processTypesService.removeStep(stepId);
  }
}