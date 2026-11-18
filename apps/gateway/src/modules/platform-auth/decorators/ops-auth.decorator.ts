import { SetMetadata } from '@nestjs/common';
import { PlatformRole } from '../entities/platform-user.entity';

export const OPS_AUTH_KEY = 'opsAuth';

export interface OpsAuthOptions {
  requireRole?: PlatformRole;
  requireElevated?: boolean;
}

export const OpsAuth = (options: OpsAuthOptions = {}) => SetMetadata(OPS_AUTH_KEY, options);
