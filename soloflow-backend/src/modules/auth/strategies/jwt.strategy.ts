import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    //   CRÍTICO: Validar se usuário e empresa ainda estão ativos
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId: payload.sub,
        companyId: payload.companyId,
        user: { isActive: true },      //   Usuário deve estar ativo
        company: { isActive: true },   //   Empresa deve estar ativa
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        sector: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!userCompany) {
      throw new UnauthorizedException('Token inválido: usuário ou empresa inativos/inexistentes');
    }

    //   MELHORADO: Retornar informações completas do contexto
    return {
      id: userCompany.user.id,
      email: userCompany.user.email,
      name: userCompany.user.name,
      companyId: payload.companyId,
      role: payload.role,
      sectorId: userCompany.sectorId,
      company: userCompany.company,
      sector: userCompany.sector,
    };
  }
}