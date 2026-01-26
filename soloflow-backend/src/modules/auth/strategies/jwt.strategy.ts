import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { ProfilesService } from '../../profiles/profiles.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private profilesService: ProfilesService,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não está definido. Configure a variável de ambiente JWT_SECRET.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: {
        userId: payload.sub,
        companyId: payload.companyId,
        user: { isActive: true },
        company: { isActive: true },
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

    // ✅ Resolve permissões baseadas nos perfis personalizados
    const resolvedPermissions = await this.profilesService.resolveUserPermissions(
      userCompany.userId,
      payload.companyId,
    );

    return {
      id: userCompany.user.id,
      email: userCompany.user.email,
      name: userCompany.user.name,
      companyId: payload.companyId,
      role: payload.role,
      sectorId: userCompany.sectorId,
      company: userCompany.company,
      sector: userCompany.sector,
      permissions: resolvedPermissions.permissions,
      profileIds: resolvedPermissions.profileIds,
      processTypePermissions: resolvedPermissions.processTypes,
    };
  }
}
