import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PlatformUser } from '../entities/platform-user.entity';

export const CurrentPlatformUser = createParamDecorator(
  (data: keyof PlatformUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.platformUser;
    return data && user ? user[data] : user;
  },
);
