import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHECK_SCOPE_KEY, ScopeRequirement } from '../decorators/check-scope.decorator';
import { ProfilesService } from '../../profiles/profiles.service';

/**
 * Guard que valida permissões com scope
 * Deve ser usado após JwtAuthGuard
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  private readonly logger = new Logger(ScopeGuard.name);

  constructor(
    private reflector: Reflector,
    private profilesService: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<ScopeRequirement>(CHECK_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      // Sem requirement, permite acesso
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('ScopeGuard: User not found in request. Ensure JwtAuthGuard runs first.');
      throw new ForbiddenException('Usuário não autenticado');
    }

    // ✅ Busca permissões baseadas nos perfis atribuídos ao usuário
    const permissions = await this.profilesService.resolveUserPermissions(
      user.id,
      user.companyId,
    );

    // Usuários com permissão wildcard (*:*) têm acesso irrestrito
    const hasWildcard = permissions.permissions.some(
      (p) => p.resource === '*' && p.action === '*',
    );
    if (hasWildcard) {
      return true;
    }

    // Verifica se possui a permissão necessária
    const matchingPermission = permissions.permissions.find(
      (p) =>
        (p.resource === requirement.resource || p.resource === '*') &&
        (p.action === requirement.action || p.action === '*'),
    );

    if (!matchingPermission) {
      this.logger.warn(
        `User ${user.id} does not have permission: ${requirement.resource}:${requirement.action}`,
      );
      throw new ForbiddenException('Você não possui permissão para realizar esta ação');
    }

    // Se possui permissão sem scope (acesso total), permite
    if (!matchingPermission.scope) {
      this.logger.debug(`User ${user.id} has unrestricted access to ${requirement.resource}:${requirement.action}`);
      return true;
    }

    // Se há scope na permissão, valida com scopeCheck
    if (requirement.scopeCheck) {
      const context = {
        user,
        params: request.params,
        query: request.query,
        body: request.body,
      };

      const isAllowed = requirement.scopeCheck(matchingPermission.scope, context);

      if (!isAllowed) {
        this.logger.warn(
          `User ${user.id} failed scope check for ${requirement.resource}:${requirement.action}`,
        );
        throw new ForbiddenException('Você não possui permissão para acessar este recurso específico');
      }

      this.logger.debug(`User ${user.id} passed scope check for ${requirement.resource}:${requirement.action}`);
      return true;
    }

    // FAIL-SECURE: Se há scope mas não há scopeCheck definido, NEGAR acesso
    // Isso força que todo endpoint com scope tenha uma função de validação explícita
    this.logger.warn(
      `User ${user.id} denied: scope exists but no scopeCheck defined for ${requirement.resource}:${requirement.action}`,
    );
    throw new ForbiddenException(
      'Configuração de permissão incompleta. Contate o administrador.',
    );
  }
}
