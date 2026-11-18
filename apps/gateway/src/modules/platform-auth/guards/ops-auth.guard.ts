import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformAuthService } from '../platform-auth.service';
import { OPS_AUTH_KEY, OpsAuthOptions } from '../decorators/ops-auth.decorator';
import { PlatformRole } from '../entities/platform-user.entity';

const ROLE_HIERARCHY: Record<PlatformRole, number> = {
  superadmin: 3,
  operator: 2,
  viewer: 1,
};

@Injectable()
export class OpsAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: PlatformAuthService,
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

    // 1. Extract session token from cookie or Authorization header
    let rawToken: string | undefined = undefined;

    if (request.cookies && request.cookies['wgy_ops_session']) {
      rawToken = request.cookies['wgy_ops_session'];
    }

    if (!rawToken) {
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const potentialToken = authHeader.substring(7).trim();
        // Brand API keys start with 'wgy_' - reject them early from ops routes
        if (potentialToken.startsWith('wgy_')) {
          throw new UnauthorizedException({
            code: 'INVALID_AUTH_CONTEXT',
            message: 'Brand API key cannot access platform operations endpoints. Use a valid IT session.',
          });
        }
        rawToken = potentialToken;
      }
    }

    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Platform IT session required. Please login at /admin/login.',
      });
    }

    // 2. Validate session token
    const result = await this.authService.validateSession(rawToken, request.ip);
    if (!result) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED_OR_INVALID',
        message: 'Your platform session is invalid or has expired. Please login again.',
      });
    }

    const { user, session } = result;

    if (user.status !== 'active') {
      throw new ForbiddenException({
        code: 'USER_SUSPENDED',
        message: 'Your IT account has been suspended. Please contact a superadmin.',
      });
    }

    // Attach to request
    request.platformUser = user;
    request.platformSession = session;

    // 3. Check role requirement
    const opsOptions = this.reflector.getAllAndOverride<OpsAuthOptions>(
      OPS_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (opsOptions && opsOptions.requireRole) {
      const userLevel = ROLE_HIERARCHY[user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[opsOptions.requireRole] || 1;

      if (userLevel < requiredLevel) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires role '${opsOptions.requireRole}'. Your current role is '${user.role}'.`,
        });
      }
    }

    // 4. Check elevation requirement (5-minute window for sensitive operations)
    if (opsOptions && opsOptions.requireElevated) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (!session.lastElevatedAt || new Date(session.lastElevatedAt).getTime() < fiveMinutesAgo) {
        throw new ForbiddenException({
          code: 'REAUTH_REQUIRED',
          message: 'Konfirmasi kata sandi (re-authentication) diperlukan untuk menjalankan tindakan sensitif ini.',
        });
      }
    }

    return true;
  }
}
