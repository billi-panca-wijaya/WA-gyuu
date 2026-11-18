import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BrandsService } from '../../brands/brands.service';
import { REQUIRED_SCOPES_KEY } from '../../../common/decorators/require-scope.decorator';

@Injectable()
export class BrandAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly brandsService: BrandsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const isOps = this.reflector.getAllAndOverride<any>('opsAuth', [
      context.getHandler(),
      context.getClass(),
    ]);
    const path = request.path || request.url || '';

    // Delegate platform operations routes to OpsAuthGuard
    if (isOps || path.startsWith('/v1/ops') || path.startsWith('/admin')) {
      return true;
    }

    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'A valid Bearer token is required.',
      });
    }

    const rawToken = authHeader.substring(7).trim();
    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Bearer token cannot be empty.',
      });
    }

    const validated = await this.brandsService.validateApiKey(rawToken);
    if (!validated) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid or revoked API key.',
      });
    }

    // Attach to request
    request.brand = validated.brand;
    request.apiClient = validated.client;

    // Check required scopes
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredScopes && requiredScopes.length > 0) {
      const clientScopes = validated.client.scopes || [];
      const hasAllScopes =
        clientScopes.includes('*') ||
        requiredScopes.every((scope) => clientScopes.includes(scope));
      if (!hasAllScopes) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: `Insufficient permissions. Required scope(s): ${requiredScopes.join(', ')}`,
        });
      }
    }

    return true;
  }
}
