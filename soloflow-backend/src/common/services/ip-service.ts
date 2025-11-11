import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IpService {
  /**
   * Extrai o IP público real do usuário considerando proxies e load balancers
   */
  getClientIp(req: Request): string {
    // Lista de headers a verificar em ordem de prioridade
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip', // Cloudflare
      'true-client-ip', // Cloudflare Enterprise
      'x-client-ip',
      'x-cluster-client-ip',
      'forwarded-for',
      'forwarded',
    ];

    // Verificar cada header
    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        // x-forwarded-for pode conter múltiplos IPs separados por vírgula
        // O primeiro IP é geralmente o IP original do cliente
        const ips = Array.isArray(value) ? value[0] : value;
        const ip = ips.split(',')[0].trim();

        if (this.isValidIp(ip)) {
          return ip;
        }
      }
    }

    // Fallback para req.ip ou req.connection.remoteAddress
    const fallbackIp = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'IP não disponível';

    // Remover prefixo IPv6 se presente
    return fallbackIp.replace(/^::ffff:/, '');
  }

  /**
   * Valida se uma string é um IP válido (IPv4 ou IPv6)
   */
  private isValidIp(ip: string): boolean {
    // Regex simples para IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    // Regex simples para IPv6
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Verifica se o IP é privado/local (não roteável na internet)
   */
  isPrivateIp(ip: string): boolean {
    // IPs locais/privados
    const privateRanges = [
      /^127\./,        // Loopback
      /^10\./,         // Classe A privada
      /^172\.(1[6-9]|2\d|3[0-1])\./, // Classe B privada
      /^192\.168\./,   // Classe C privada
      /^::1$/,         // IPv6 loopback
      /^fe80:/,        // IPv6 link-local
      /^fc00:/,        // IPv6 unique local
    ];

    return privateRanges.some(range => range.test(ip));
  }
}
