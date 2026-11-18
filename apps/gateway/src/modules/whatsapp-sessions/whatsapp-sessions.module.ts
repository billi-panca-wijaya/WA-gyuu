import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppSession } from './entities/whatsapp-session.entity';
import { WhatsAppSessionsService } from './whatsapp-sessions.service';
import { WhatsAppSessionsController } from './whatsapp-sessions.controller';
import { EngineAdaptersModule } from '../../engine-adapters/engine-adapters.module';
import { BrandsModule } from '../brands/brands.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppSession]),
    EngineAdaptersModule,
    BrandsModule,
  ],
  controllers: [WhatsAppSessionsController],
  providers: [WhatsAppSessionsService],
  exports: [WhatsAppSessionsService],
})
export class WhatsAppSessionsModule {}
