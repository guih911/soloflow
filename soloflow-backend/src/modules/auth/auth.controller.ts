import { Controller, Post, Body, UseGuards, Request, Get, Delete, Param } from '@nestjs/common';
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

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @Post('switch-company')
  @UseGuards(JwtAuthGuard)
  async switchCompany(@Body() switchDto: SwitchCompanyDto, @Request() req) {
    return this.authService.switchCompany(req.user.id, switchDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.checkUserPermissions(req.user.id, req.user.companyId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getActiveSessions(@Request() req) {
    const tokens = await this.authService.getActiveTokens(req.user.id);
    return { sessions: tokens };
  }

  @Delete('sessions/:tokenId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@Param('tokenId') tokenId: string, @Request() req) {
    const revoked = await this.authService.revokeTokenById(tokenId, req.user.id);
    return { success: revoked };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAllDevices(@Request() req) {
    const count = await this.authService.revokeAllUserTokens(req.user.id);
    return { revokedCount: count };
  }
}