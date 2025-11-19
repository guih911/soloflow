import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  @Get()
  async getNotifications(@Request() req) {
    // Por enquanto, retorna array vazio
    // Futuramente, implementar sistema de notificações real
    return [];
  }

  @Get('count')
  async getUnreadCount(@Request() req) {
    // Por enquanto, retorna 0
    return { count: 0 };
  }
}
