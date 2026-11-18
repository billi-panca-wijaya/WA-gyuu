import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BaileysAdapterService } from './baileys/baileys-adapter.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BaileysAdapterService,
    {
      provide: 'IWhatsAppEngineAdapter',
      useExisting: BaileysAdapterService,
    },
  ],
  exports: [BaileysAdapterService, 'IWhatsAppEngineAdapter'],
})
export class EngineAdaptersModule {}
