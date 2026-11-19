import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BaileysAdapterService } from '../../engine-adapters/baileys/baileys-adapter.service';
import { Brand } from '../brands/entities/brand.entity';
import { WhatsAppSession } from './entities/whatsapp-session.entity';
import { WhatsAppSessionsService } from './whatsapp-sessions.service';

import { InboxStore } from './inbox.store';

@Injectable()
export class InboxService {
  constructor(
    private readonly sessions: WhatsAppSessionsService,
    private readonly store: InboxStore,
    private readonly engine: BaileysAdapterService,
  ) {}

  private async sender(brand: Brand, senderId: string): Promise<WhatsAppSession> {
    if (!this.store.enabled(brand.code)) {
      throw new ForbiddenException('Inbox belum aktif untuk brand ini.');
    }
    return this.sessions.getSender(brand.id, senderId);
  }

  async conversations(brand: Brand, senderId: string) {
    await this.sender(brand, senderId);
    return this.store.conversations(senderId);
  }

  async messages(brand: Brand, senderId: string, peerId: string) {
    await this.sender(brand, senderId);
    return this.store.history(senderId, peerId);
  }

  async reply(brand: Brand, senderId: string, peerId: string, text: string) {
    await this.sender(brand, senderId);
    const last = await this.store.latest(senderId, peerId);
    if (!last) throw new NotFoundException('Percakapan tidak ditemukan.');

    const id = await this.engine.sendInboxText(senderId, peerId, text);
    const message = { id, peerId, label: last.label, text, sentAt: Date.now() };
    await this.store.record(senderId, message, true);
    return { id, text, sentAt: message.sentAt, outgoing: true };
  }
}
