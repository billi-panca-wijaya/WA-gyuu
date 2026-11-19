import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { BrandsModule } from './modules/brands/brands.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { EngineAdaptersModule } from './engine-adapters/engine-adapters.module';
import { WhatsAppSessionsModule } from './modules/whatsapp-sessions/whatsapp-sessions.module';
import { OtpModule } from './modules/otp/otp.module';
import { AuditModule } from './modules/audit/audit.module';
import { PlatformAuthModule } from './modules/platform-auth/platform-auth.module';
import { AdminOpsModule } from './modules/admin-ops/admin-ops.module';
import { Brand } from './modules/brands/entities/brand.entity';
import { ApiClient } from './modules/brands/entities/api-client.entity';
import { WhatsAppSession } from './modules/whatsapp-sessions/entities/whatsapp-session.entity';
import { InboxMessage } from './modules/whatsapp-sessions/entities/inbox-message.entity';
import { OtpChallenge } from './modules/otp/entities/otp-challenge.entity';
import { OtpDelivery } from './modules/otp/entities/otp-delivery.entity';
import { PlatformUser } from './modules/platform-auth/entities/platform-user.entity';
import { PlatformSession } from './modules/platform-auth/entities/platform-session.entity';
import { AdminAuditLog } from './modules/audit/entities/admin-audit-log.entity';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('database.database'),
        entities: [
          Brand,
          ApiClient,
          WhatsAppSession,
          InboxMessage,
          OtpChallenge,
          OtpDelivery,
          PlatformUser,
          PlatformSession,
          AdminAuditLog,
        ],
        synchronize: true,
      }),
    }),
    HealthModule,
    BrandsModule,
    AuthenticationModule,
    EngineAdaptersModule,
    WhatsAppSessionsModule,
    OtpModule,
    AuditModule,
    PlatformAuthModule,
    AdminOpsModule,
  ],
})
export class AppModule {}
