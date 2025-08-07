import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

  // ✅ NOVO: Switch de empresa
  @Post('switch-company')
  @UseGuards(JwtAuthGuard)
  async switchCompany(@Body() switchDto: SwitchCompanyDto, @Request() req) {
    return this.authService.switchCompany(req.user.id, switchDto);
  }

  // ✅ NOVO: Refresh token
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.id);
  }

  // ✅ NOVO: Verificar permissões atuais
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.checkUserPermissions(req.user.id, req.user.companyId);
  }
}