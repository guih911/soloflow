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
  HttpStatus,
  HttpCode,
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

  // ✅ CORRIGIDO: Método POST com melhor tratamento
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateProcessTypeDto, @Request() req) {
    console.log('🎯 POST /process-types called by user:', req.user.email);
    console.log('📋 Request payload:', JSON.stringify(createDto, null, 2));
    
    try {
      // ✅ Se não for admin, forçar a empresa do usuário
      if (req.user.role !== UserRole.ADMIN) {
        createDto.companyId = req.user.companyId;
        console.log('🔒 Non-admin user, forced companyId:', createDto.companyId);
      }
      
      // ✅ Validação básica
      if (!createDto.companyId) {
        console.log('❌ Missing companyId in request');
        throw new Error('ID da empresa é obrigatório');
      }
      
      console.log('⏳ Calling service create method...');
      const result = await this.processTypesService.create(createDto);
      

      
      return result;
    } catch (error) {
      console.error('❌ Error in create controller:', error);
      throw error;
    }
  }

  // ✅ CORRIGIDO: Método GET com logs melhorados
  @Get()
  async findAll(@Request() req) {
    console.log('🎯 GET /process-types called by user:', req.user.email);
    
    try {
      const companyId = req.user.companyId;
      console.log('🏢 Fetching for company:', companyId);
      
      if (!companyId) {
        console.log('❌ No companyId in user session');
        throw new Error('ID da empresa não encontrado na sessão');
      }
      
      const result = await this.processTypesService.findAll(companyId);
      
      
      
      return result;
    } catch (error) {
      console.error('❌ Error in findAll controller:', error);
      throw error;
    }
  }

  // ✅ MELHORADO: Método GET por ID com logs
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    console.log('🎯 GET /process-types/:id called:', { id, user: req.user.email });
    
    try {
      const result = await this.processTypesService.findOne(id);
      
     
      return result;
    } catch (error) {
      console.error('❌ Error in findOne controller:', error);
      throw error;
    }
  }

  // ✅ MELHORADO: Método PATCH com logs
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(@Param('id') id: string, @Body() updateDto: UpdateProcessTypeDto, @Request() req) {
    console.log('🎯 PATCH /process-types/:id called:', { id, user: req.user.email });
    console.log('📋 Update payload:', JSON.stringify(updateDto, null, 2));
    
    try {
      const result = await this.processTypesService.update(id, updateDto);
      
      console.log('✅ Process type updated successfully:', {
        id: result.id,
        name: result.name
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error in update controller:', error);
      throw error;
    }
  }

  // ✅ Endpoints para gerenciar campos de formulário
  @Post(':id/form-fields')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addFormField(@Param('id') id: string, @Body() createFormFieldDto: CreateFormFieldDto, @Request() req) {
    console.log('🎯 POST /process-types/:id/form-fields called:', { id, user: req.user.email });
    
    try {
      const result = await this.processTypesService.addFormField(id, createFormFieldDto);
      console.log('✅ Form field added successfully');
      return result;
    } catch (error) {
      console.error('❌ Error in addFormField controller:', error);
      throw error;
    }
  }

  @Patch('form-fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateFormField(@Param('fieldId') fieldId: string, @Body() updateFormFieldDto: UpdateFormFieldDto, @Request() req) {
    console.log('🎯 PATCH /process-types/form-fields/:fieldId called:', { fieldId, user: req.user.email });
    
    try {
      const result = await this.processTypesService.updateFormField(fieldId, updateFormFieldDto);
      console.log('✅ Form field updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error in updateFormField controller:', error);
      throw error;
    }
  }

  @Delete('form-fields/:fieldId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeFormField(@Param('fieldId') fieldId: string, @Request() req) {
    console.log('🎯 DELETE /process-types/form-fields/:fieldId called:', { fieldId, user: req.user.email });
    
    try {
      await this.processTypesService.removeFormField(fieldId);
      console.log('✅ Form field removed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error in removeFormField controller:', error);
      throw error;
    }
  }

  // ✅ Endpoints para gerenciar etapas
  @Post(':id/steps')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addStep(@Param('id') id: string, @Body() createStepDto: CreateStepDto, @Request() req) {
    console.log('🎯 POST /process-types/:id/steps called:', { id, user: req.user.email });
    
    try {
      const result = await this.processTypesService.addStep(id, createStepDto);
      console.log('✅ Step added successfully');
      return result;
    } catch (error) {
      console.error('❌ Error in addStep controller:', error);
      throw error;
    }
  }

  @Patch('steps/:stepId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateStep(@Param('stepId') stepId: string, @Body() updateStepDto: Partial<CreateStepDto>, @Request() req) {
    console.log('🎯 PATCH /process-types/steps/:stepId called:', { stepId, user: req.user.email });
    
    try {
      const result = await this.processTypesService.updateStep(stepId, updateStepDto);
      console.log('✅ Step updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Error in updateStep controller:', error);
      throw error;
    }
  }

  @Delete('steps/:stepId')
  @Roles(UserRole.ADMIN)
  async removeStep(@Param('stepId') stepId: string, @Request() req) {
    console.log('🎯 DELETE /process-types/steps/:stepId called:', { stepId, user: req.user.email });
    
    try {
      await this.processTypesService.removeStep(stepId);
      console.log('✅ Step removed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error in removeStep controller:', error);
      throw error;
    }
  }

  // ✅ NOVO: Endpoint para verificar saúde da API
  @Get('health/check')
  async healthCheck(@Request() req) {
    console.log('🏥 Health check called by:', req.user?.email || 'anonymous');
    
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        throw new Error('No company ID in session');
      }
      
      // Teste rápido de conectividade
      const count = await this.processTypesService.findAll(companyId);
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        companyId,
        processTypesCount: count.length,
        user: req.user?.email
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}