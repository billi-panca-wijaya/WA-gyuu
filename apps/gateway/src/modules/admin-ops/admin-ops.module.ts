import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { ApiClient } from '../brands/entities/api-client.entity';
import { WhatsAppSession } from '../whatsapp-sessions/entities/whatsapp-session.entity';
import { OtpChallenge } from '../otp/entities/otp-challenge.entity';
import { OtpDelivery } from '../otp/entities/otp-delivery.entity';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOpsService } from './admin-ops.service';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Brand,
      ApiClient,
      WhatsAppSession,
      OtpChallenge,
      OtpDelivery,
    ]),
    PlatformAuthModule,
    AuditModule,
  ],
  controllers: [AdminOpsController],
  providers: [AdminOpsService],
  exports: [AdminOpsService],
})
export class AdminOpsModule {}
