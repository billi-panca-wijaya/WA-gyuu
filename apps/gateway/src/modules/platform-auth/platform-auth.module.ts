import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformUser } from './entities/platform-user.entity';
import { PlatformSession } from './entities/platform-session.entity';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthController } from './platform-auth.controller';
import { OpsAuthGuard } from './guards/ops-auth.guard';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformUser, PlatformSession]),
    AuditModule,
  ],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService, OpsAuthGuard],
  exports: [PlatformAuthService, OpsAuthGuard, TypeOrmModule],
})
export class PlatformAuthModule {}
