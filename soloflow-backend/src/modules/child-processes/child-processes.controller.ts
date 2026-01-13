import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChildProcessesService } from './child-processes.service';
import {
  CreateChildProcessConfigDto,
  CreateChildProcessDto,
  UpdateChildProcessConfigDto,
} from './dto';

@Controller('child-processes')
@UseGuards(JwtAuthGuard)
export class ChildProcessesController {
  constructor(private readonly childProcessesService: ChildProcessesService) {}

  // ════════════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÕES DE SUB-PROCESSOS
  // ════════════════════════════════════════════════════════════════════════════════

  @Post('configs')
  async createConfig(
    @Body() dto: CreateChildProcessConfigDto,
    @Request() req: any,
  ) {
    return this.childProcessesService.createConfig(dto, req.user.id);
  }

  @Put('configs/:configId')
  async updateConfig(
    @Param('configId') configId: string,
    @Body() dto: UpdateChildProcessConfigDto,
    @Request() req: any,
  ) {
    return this.childProcessesService.updateConfig(configId, dto, req.user.id);
  }

  @Delete('configs/:configId')
  async deleteConfig(
    @Param('configId') configId: string,
    @Request() req: any,
  ) {
    await this.childProcessesService.deleteConfig(configId, req.user.id);
    return { success: true, message: 'Configuração removida com sucesso' };
  }

  @Get('configs/process/:processInstanceId')
  async getConfigsByProcess(
    @Param('processInstanceId') processInstanceId: string,
    @Request() req: any,
  ) {
    return this.childProcessesService.getConfigsByProcess(
      processInstanceId,
      req.user.id,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SUB-PROCESSOS
  // ════════════════════════════════════════════════════════════════════════════════

  @Post()
  async createChildProcess(
    @Body() dto: CreateChildProcessDto,
    @Request() req: any,
  ) {
    return this.childProcessesService.createChildProcess(dto, req.user.id);
  }

  @Get('parent/:parentProcessInstanceId')
  async getChildProcesses(
    @Param('parentProcessInstanceId') parentProcessInstanceId: string,
    @Request() req: any,
  ) {
    return this.childProcessesService.getChildProcesses(
      parentProcessInstanceId,
      req.user.id,
    );
  }

  @Get('child/:childProcessInstanceId/parent')
  async getParentProcess(
    @Param('childProcessInstanceId') childProcessInstanceId: string,
    @Request() req: any,
  ) {
    return this.childProcessesService.getParentProcess(
      childProcessInstanceId,
      req.user.id,
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // SINCRONIZAÇÃO (chamado internamente quando processo filho é atualizado)
  // ════════════════════════════════════════════════════════════════════════════════

  @Post('sync/:childProcessInstanceId')
  async syncChildProcessStatus(
    @Param('childProcessInstanceId') childProcessInstanceId: string,
  ) {
    await this.childProcessesService.syncChildProcessStatus(childProcessInstanceId);
    return { success: true };
  }
}