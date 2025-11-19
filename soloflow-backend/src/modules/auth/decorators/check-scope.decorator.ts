import { SetMetadata } from '@nestjs/common';

export interface ScopeRequirement {
  resource: string;
  action: string;
  scopeCheck?: (scope: Record<string, any> | null, context: any) => boolean;
}

export const CHECK_SCOPE_KEY = 'checkScope';

/**
 * Decorator para verificar permissões com scope
 *
 * @example
 * // Verificar se usuário pode editar apenas seus próprios processos
 * @CheckScope({
 *   resource: 'processes',
 *   action: 'update',
 *   scopeCheck: (scope, context) => {
 *     if (!scope) return true; // Sem scope = acesso total
 *     if (scope.ownedBy === 'userId') {
 *       return context.params.userId === context.user.id;
 *     }
 *     return false;
 *   }
 * })
 */
export const CheckScope = (requirement: ScopeRequirement) =>
  SetMetadata(CHECK_SCOPE_KEY, requirement);
