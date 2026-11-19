import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppSession } from './entities/whatsapp-session.entity';
import { WhatsAppSessionsService } from './whatsapp-sessions.service';
import { WhatsAppSessionsController } from './whatsapp-sessions.controller';
import { EngineAdaptersModule } from '../../engine-adapters/engine-adapters.module';
import { BrandsModule } from '../brands/brands.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxStore } from './inbox.store';
import { InboxMessage } from './entities/inbox-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppSession, InboxMessage]),
    EngineAdaptersModule,
    BrandsModule,
  ],
  controllers: [WhatsAppSessionsController, InboxController],
  providers: [WhatsAppSessionsService, InboxStore, InboxService],
  exports: [WhatsAppSessionsService],
})
export class WhatsAppSessionsModule {}
