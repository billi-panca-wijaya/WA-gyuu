import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Controller('v1/health')
export class HealthController {
  @Public()
  @Get('liveness')
  getLiveness() {
    return {
      status: 'ok',
      uptime_seconds: Math.floor(process.uptime()),
    };
  }

  @Public()
  @Get('readiness')
  getReadiness() {
    return {
      status: 'ok',
      services: {
        database: 'connected',
        storage: 'ready',
      },
    };
  }
}
