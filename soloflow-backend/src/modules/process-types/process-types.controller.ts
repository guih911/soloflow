import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request
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

// Interface estendida para updates com versionamento
interface UpdateProcessTypeWithVersioningDto extends UpdateProcessTypeDto {
  steps?: CreateStepDto[];
  formFields?: CreateFormFieldDto[];
}

@Controller('process-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessTypesController {
  private readonly logger = new Logger(ProcessTypesController.name);

  constructor(private readonly processTypesService: ProcessTypesService) {
    this.logger.log('ProcessTypesController initialized');
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProcessTypeDto: CreateProcessTypeDto, @Request() req?: any) {
    this.logger.log(`POST /process-types - Creating process type: ${createProcessTypeDto.name}`);
    this.logger.debug(`Request body:`, JSON.stringify(createProcessTypeDto, null, 2));
    
    try {
      // Validação básica
      if (!createProcessTypeDto.companyId) {
        throw new BadRequestException('companyId is required');
      }

      const result = await this.processTypesService.create(createProcessTypeDto);
      this.logger.log(`✅ Process type created successfully: ${result.id} - ${result.name}`);
      return {
        success: true,
        data: result,
        message: 'Process type created successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error creating process type: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async findAll(@Query('companyId') companyId?: string) {
    this.logger.log(`GET /process-types - Finding all process types for company: ${companyId}`);
    
    if (!companyId) {
      this.logger.error('Missing companyId query parameter');
      throw new BadRequestException('companyId query parameter is required');
    }
    
    try {
      const result = await this.processTypesService.findAll(companyId);
      this.logger.log(`✅ Found ${result.length} process types for company ${companyId}`);
      return {
        success: true,
        data: result,
        count: result.length
      };
    } catch (error) {
      this.logger.error(`❌ Error finding process types: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /process-types/${id} - Finding process type`);
    
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid process type ID');
    }
    
    try {
      const result = await this.processTypesService.findOne(id);
      if (!result) {
        this.logger.warn(`Process type not found: ${id}`);
        throw new NotFoundException(`Process type with ID ${id} not found`);
      }
      // Correção: usar cast ou verificação de propriedade
      const version = (result as any).version || (result as any).versionLabel || 1;
      this.logger.log(`✅ Process type found: ${result.name} (v${version})`);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(`❌ Error finding process type ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string, 
    @Body() updateProcessTypeDto: UpdateProcessTypeWithVersioningDto,
    @Request() req?: any
  ) {
    this.logger.log(`PATCH /process-types/${id} - Updating process type with versioning`);
    this.logger.debug(`Request body:`, JSON.stringify(updateProcessTypeDto, null, 2));
    
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid process type ID');
    }

    try {
      // Verificar se o processo existe antes de tentar atualizar
      const existingProcess = await this.processTypesService.findOne(id);
      if (!existingProcess) {
        this.logger.warn(`Process type not found for update: ${id}`);
        throw new NotFoundException(`Process type with ID ${id} not found`);
      }

      const currentVersion = (existingProcess as any).version || (existingProcess as any).versionLabel || 1;
      this.logger.log(`Updating process type: ${existingProcess.name} (current version: ${currentVersion})`);
      
      // Chamar o método de update com versionamento
      const result = await this.processTypesService.update(id, updateProcessTypeDto);
      
      const newVersion = (result as any).version || (result as any).versionLabel || 'N/A';
      this.logger.log(`✅ Process type updated successfully: ${result.id} - ${result.name} (new version: ${newVersion})`);
      
      return {
        success: true,
        data: result,
        message: `Process type updated successfully. New version: ${newVersion}`
      };
    } catch (error) {
      this.logger.error(`❌ Error updating process type ${id}: ${error.message}`, error.stack);
      
      // Fornecer mensagens de erro mais específicas
      if (error.name === 'NotFoundException') {
        throw new NotFoundException(`Process type with ID ${id} not found`);
      } else if (error.name === 'BadRequestException') {
        throw error;
      } else {
        throw new BadRequestException(`Failed to update process type: ${error.message}`);
      }
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    this.logger.log(`DELETE /process-types/${id} - Removing process type`);
    
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Invalid process type ID');
    }

    try {
      // Verificar se existe antes de remover
      const existingProcess = await this.processTypesService.findOne(id);
      if (!existingProcess) {
        this.logger.warn(`Process type not found for deletion: ${id}`);
        throw new NotFoundException(`Process type with ID ${id} not found`);
      }

      await this.processTypesService.remove(id);
      this.logger.log(`✅ Process type removed successfully: ${id} - ${existingProcess.name}`);
      
      return {
        success: true,
        message: 'Process type removed successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error removing process type ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== FORM FIELDS ENDPOINTS ====================

  @Post(':processTypeId/form-fields')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async addFormField(
    @Param('processTypeId') processTypeId: string,
    @Body() createFormFieldDto: CreateFormFieldDto
  ): Promise<any> {
    this.logger.log(`POST /process-types/${processTypeId}/form-fields - Adding form field`);
    
    try {
      const result = await this.processTypesService.addFormField(processTypeId, createFormFieldDto);
      this.logger.log(`✅ Form field added: ${result.name}`);
      return {
        success: true,
        data: result,
        message: 'Form field added successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error adding form field: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch('form-fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateFormField(
    @Param('fieldId') fieldId: string,
    @Body() updateFormFieldDto: UpdateFormFieldDto
  ): Promise<any> {
    this.logger.log(`PATCH /process-types/form-fields/${fieldId} - Updating form field`);
    
    try {
      const result = await this.processTypesService.updateFormField(fieldId, updateFormFieldDto);
      this.logger.log(`✅ Form field updated: ${result.name}`);
      return {
        success: true,
        data: result,
        message: 'Form field updated successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error updating form field: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('form-fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFormField(@Param('fieldId') fieldId: string) {
    this.logger.log(`DELETE /process-types/form-fields/${fieldId} - Removing form field`);
    
    try {
      await this.processTypesService.removeFormField(fieldId);
      this.logger.log(`✅ Form field removed: ${fieldId}`);
      return {
        success: true,
        message: 'Form field removed successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error removing form field: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== STEPS ENDPOINTS ====================

  @Post(':processTypeId/steps')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async addStep(
    @Param('processTypeId') processTypeId: string,
    @Body() createStepDto: CreateStepDto
  ): Promise<any> {
    this.logger.log(`POST /process-types/${processTypeId}/steps - Adding step: ${createStepDto.name}`);
    
    try {
      const result = await this.processTypesService.addStep(processTypeId, createStepDto);
      this.logger.log(`✅ Step added: ${result.name} (Order: ${result.order})`);
      return {
        success: true,
        data: result,
        message: 'Step added successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error adding step: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch('steps/:stepId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateStep(
    @Param('stepId') stepId: string,
    @Body() updateStepDto: Partial<CreateStepDto>
  ): Promise<any> {
    this.logger.log(`PATCH /process-types/steps/${stepId} - Updating step`);
    
    try {
      const result = await this.processTypesService.updateStep(stepId, updateStepDto);
      this.logger.log(`✅ Step updated: ${result.name}`);
      return {
        success: true,
        data: result,
        message: 'Step updated successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error updating step: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete('steps/:stepId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStep(@Param('stepId') stepId: string) {
    this.logger.log(`DELETE /process-types/steps/${stepId} - Removing step`);
    
    try {
      await this.processTypesService.removeStep(stepId);
      this.logger.log(`✅ Step removed: ${stepId}`);
      return {
        success: true,
        message: 'Step removed successfully'
      };
    } catch (error) {
      this.logger.error(`❌ Error removing step: ${error.message}`, error.stack);
      throw error;
    }
  }



  @Get('debug/health')
  getHealth() {
    this.logger.log('GET /process-types/debug/health - Health check');
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ProcessTypesController',
      message: 'Service is running'
    };
  }

  @Get('debug/routes')
  getRoutes() {
    this.logger.log('GET /process-types/debug/routes - Listing available routes');
    return {
      routes: [
        'GET /process-types?companyId=xxx - List all process types',
        'GET /process-types/:id - Get single process type',
        'POST /process-types - Create new process type',
        'PATCH /process-types/:id - Update process type (with versioning)',
        'DELETE /process-types/:id - Delete process type',
        'POST /process-types/:processTypeId/form-fields - Add form field',
        'PATCH /process-types/form-fields/:fieldId - Update form field',
        'DELETE /process-types/form-fields/:fieldId - Delete form field',
        'POST /process-types/:processTypeId/steps - Add step',
        'PATCH /process-types/steps/:stepId - Update step',
        'DELETE /process-types/steps/:stepId - Delete step',
        'GET /process-types/debug/health - Health check',
        'GET /process-types/debug/routes - This endpoint'
      ],
      timestamp: new Date().toISOString()
    };
  }
}