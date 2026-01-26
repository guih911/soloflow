import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Função para obter origens CORS do ambiente
function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS;
  if (origins) {
    return origins.split(',').map(o => o.trim());
  }
  // Fallback para desenvolvimento
  return ['http://localhost:5173', 'http://localhost:3000'];
}

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  namespace: '/notifications',
  pingInterval: 25000,
  pingTimeout: 60000,
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        this.logger.warn(`Conexão rejeitada: sem token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string);
      const userId = payload.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Associar userId ao socket
      client.data.userId = userId;
      // Entrar na room do usuário para mensagens direcionadas
      client.join(`user:${userId}`);

      this.logger.log(`Usuário conectado: ${userId}`);
    } catch (error) {
      this.logger.warn(`Autenticação WebSocket falhou: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      this.logger.log(`Usuário desconectado: ${userId}`);
    }
  }

  sendToUser(userId: string, notification: Record<string, any>) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification', notification);
    }
  }
}
