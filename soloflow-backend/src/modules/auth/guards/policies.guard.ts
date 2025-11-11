import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { POLICY_KEY, PolicyMetadata } from '../decorators/policy.decorator';

interface RequestWithUser extends Request {
  user: any;
}

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const policy = this.reflector.getAllAndOverride<PolicyMetadata | undefined>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userPermissions = request.user?.permissions;
    if (!userPermissions) {
      return false;
    }

    const { resource, action } = policy;

    if (userPermissions.some((permission) => permission.resource === '*' && permission.action === '*')) {
      return true;
    }

    return userPermissions.some((permission) => {
      const resourceMatch = permission.resource === resource || permission.resource === '*';
      const actionMatch = permission.action === action || permission.action === '*';
      return resourceMatch && actionMatch;
    });
  }
}
