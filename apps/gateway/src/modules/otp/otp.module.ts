import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { OtpDelivery } from './entities/otp-delivery.entity';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { BrandsModule } from '../brands/brands.module';
import { WhatsAppSessionsModule } from '../whatsapp-sessions/whatsapp-sessions.module';
import { EngineAdaptersModule } from '../../engine-adapters/engine-adapters.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpChallenge, OtpDelivery]),
    BrandsModule,
    WhatsAppSessionsModule,
    EngineAdaptersModule,
  ],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
