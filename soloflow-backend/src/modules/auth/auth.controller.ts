import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Request() req) {
    // Retorna um novo token com as mesmas informações
    return this.authService.refreshToken(req.user);
  }

  //    Switch de empresa
  @Post('switch-company')
  @UseGuards(JwtAuthGuard)
  async switchCompany(@Body() switchDto: SwitchCompanyDto, @Request() req) {
    return this.authService.switchCompany(req.user.id, switchDto);
  }

  //    Verificar permissões atuais
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.checkUserPermissions(req.user.id, req.user.companyId);
  }
}