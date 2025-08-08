import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  CanActivate,
  ExecutionContext,
  createParamDecorator,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

declare global {
  namespace Express {
    interface Request {
      companyContext?: {
        companyId: string;
        userRole: string;
        sectorId?: string;
        permissions: string[];
        isValidated: boolean;
      };
    }
  }
}

@Injectable()
export class CompanyContextMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Só aplica se existir usuário autenticado
    if (!req.user) {
      return next();
    }

    // Força o tipo conhecido de user
    const user = req.user as { id: string; companyId: string };
    const { id: userId, companyId } = user;

    try {
      const userCompany = await this.prisma.userCompany.findFirst({
        where: {
          userId,
          companyId,
          company: { isActive: true },
          user:    { isActive: true },
        },
        include: {
          company: true,
          sector:  true,
        },
      });

      if (!userCompany) {
        throw new ForbiddenException('Acesso negado: contexto empresarial inválido');
      }

      req.companyContext = {
        companyId:   userCompany.companyId,
        userRole:    userCompany.role,
        sectorId:    userCompany.sectorId ?? undefined,
        permissions: this.getRolePermissions(userCompany.role),
        isValidated: true,
      };

      next();
    } catch {
      throw new ForbiddenException('Falha na validação do contexto empresarial');
    }
  }

  private getRolePermissions(role: string): string[] {
    const permissions = {
      ADMIN: [
        'manage_companies',
        'manage_users',
        'manage_sectors',
        'manage_process_types',
        'manage_processes',
        'view_all_processes',
        'execute_any_step',
        'system_settings',
        'view_reports',
      ],
      MANAGER: [
        'manage_users',
        'manage_sectors',
        'manage_process_types',
        'view_company_processes',
        'execute_assigned_steps',
        'view_reports',
      ],
      USER: [
        'create_processes',
        'view_own_processes',
        'execute_assigned_steps',
      ],
    };
    return permissions[role] || [];
  }
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class CompanyPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const companyContext = request.companyContext;
    if (!companyContext?.isValidated) {
      return false;
    }

    return requiredPermissions.some(permission =>
      companyContext.permissions.includes(permission),
    );
  }
}

export const CompanyContext = createParamDecorator(
  (data: keyof Request['companyContext'], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const companyContext = request.companyContext;
    if (!companyContext?.isValidated) {
      throw new ForbiddenException('Contexto empresarial não disponível');
    }
    return data ? companyContext[data] : companyContext;
  },
);
