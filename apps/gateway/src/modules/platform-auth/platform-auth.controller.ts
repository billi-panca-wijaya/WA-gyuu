import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PlatformAuthService } from './platform-auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { OpsAuth } from './decorators/ops-auth.decorator';
import { OpsAuthGuard } from './guards/ops-auth.guard';
import { CurrentPlatformUser } from './decorators/current-user.decorator';
import { PlatformUser } from './entities/platform-user.entity';

@Controller('v1/ops/auth')
export class PlatformAuthController {
  constructor(private readonly authService: PlatformAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { identifier?: string; username?: string; password?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const identifier = body.identifier || body.username || '';
    const password = body.password || '';
    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    const result = await this.authService.login(identifier, password, ip, userAgent);

    // Set secure HttpOnly cookie (30 days persistence)
    const isProduction = process.env.NODE_ENV === 'production';
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    res.cookie('wgy_ops_session', result.sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: thirtyDaysMs,
      expires: new Date(Date.now() + thirtyDaysMs),
    });

    return {
      data: {
        session_token: result.sessionToken,
        user: result.user,
        expires_at: result.expiresAt,
      },
    };
  }

  @UseGuards(OpsAuthGuard)
  @OpsAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @CurrentPlatformUser() user: PlatformUser,
  ) {
    const session = req.platformSession;
    if (session) {
      await this.authService.logout(
        session.id,
        user.id,
        user.username,
        req.ip || '127.0.0.1',
      );
    }

    res.clearCookie('wgy_ops_session', { path: '/' });

    return {
      data: {
        message: 'Sesi IT berhasil dicabut. Anda telah keluar.',
      },
    };
  }

  @UseGuards(OpsAuthGuard)
  @OpsAuth()
  @Get('me')
  async me(@CurrentPlatformUser() user: PlatformUser, @Req() req: any) {
    return {
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        mfa_enabled: user.mfaEnabled,
        last_elevated_at: req.platformSession?.lastElevatedAt || null,
      },
    };
  }

  @UseGuards(OpsAuthGuard)
  @OpsAuth()
  @Post('reauth')
  @HttpCode(HttpStatus.OK)
  async reauth(
    @Body() body: { password?: string },
    @Req() req: any,
    @CurrentPlatformUser() user: PlatformUser,
  ) {
    await this.authService.reauthenticate(
      user.id,
      req.platformSession.id,
      body.password || '',
      req.ip || '127.0.0.1',
    );

    return {
      data: {
        elevated: true,
        elevated_until: new Date(Date.now() + 5 * 60 * 1000),
      },
    };
  }
}
