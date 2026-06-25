import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { FEATURE_KEY } from './feature.decorator';
import { FeatureAccessService } from './feature-access.service';
import { FeatureKey } from './features';

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<FeatureKey>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const enabled = await this.featureAccessService.isEnabled(user.organizationId, featureKey);

    if (!enabled) {
      throw new ForbiddenException('This feature is not enabled for your organization.');
    }

    return true;
  }
}
