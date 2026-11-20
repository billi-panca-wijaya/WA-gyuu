import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { InboxHistoryMessage, InboxText } from '../../engine-adapters/interfaces/whatsapp-engine.interface';
import { InboxMessage } from './entities/inbox-message.entity';

@Injectable()
export class InboxStore {
  private readonly brands: string[];
  private readonly historyBrands: string[];

  constructor(
    @InjectRepository(InboxMessage) private readonly messages: Repository<InboxMessage>,
    private readonly config: ConfigService,
  ) {
    const brandList = (key: string) => (this.config.get<string>(key) ?? '')
      .split(',').map(code => code.trim().toLowerCase()).filter(Boolean);
    this.brands = brandList('WAGYUU_INBOX_BRANDS');
    this.historyBrands = brandList('WAGYUU_INBOX_HISTORY_BRANDS');
  }

  enabled(brandCode: string): boolean {
    if (!brandCode) return false;
    const code = brandCode.toLowerCase().trim();
    if (this.brands.includes('*')) return true;
    return this.brands.includes(code) || this.brands.includes(code.replace(/[-_]/g, ''));
  }

  historyEnabled(brandCode: string): boolean {
    if (!brandCode) return false;
    const code = brandCode.toLowerCase().trim();
    if (!this.enabled(code)) return false;
    if (this.historyBrands.includes('*')) return true;
    return this.historyBrands.includes(code) || this.historyBrands.includes(code.replace(/[-_]/g, ''));
  }

  async record(senderId: string, message: InboxText, outgoing = false): Promise<void> {
    await this.recordHistory(senderId, [{ ...message, outgoing }]);
  }

  async recordHistory(senderId: string, messages: InboxHistoryMessage[]): Promise<void> {
    for (let start = 0; start < messages.length; start += 100) {
      const batch = messages.slice(start, start + 100).map(message => ({ senderId, ...message }));
      await this.messages.createQueryBuilder().insert().values(batch).orIgnore().execute();
    }
  }

  async conversations(senderId: string) {
    // A ranked query keeps the latest message for each peer, including ties in timestamps.
    return this.messages.query(
      'SELECT peer_id AS peerId, label, text AS preview, sent_at AS sentAt FROM (' +
      'SELECT *, ROW_NUMBER() OVER (PARTITION BY peer_id ORDER BY sent_at DESC, message_id DESC) AS ranking ' +
      'FROM whatsapp_inbox_messages WHERE sender_id = ?) WHERE ranking = 1 ORDER BY sent_at DESC, peer_id LIMIT 250',
      [senderId],
    );
  }

  async history(senderId: string, peerId: string) {
    const latest = await this.messages.find({
      where: { senderId, peerId },
      select: ['id', 'text', 'outgoing', 'sentAt'],
      order: { sentAt: 'DESC', id: 'DESC' },
      take: 100,
    });
    return latest.reverse();
  }

  latest(senderId: string, peerId: string) {
    return this.messages.findOne({ where: { senderId, peerId }, order: { sentAt: 'DESC', id: 'DESC' } });
  }
}

