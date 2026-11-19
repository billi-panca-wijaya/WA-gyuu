import { ConfigService } from '@nestjs/config';
import type { BaileysEventMap, WAMessage } from '@whiskeysockets/baileys';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BaileysAdapterService } from './baileys-adapter.service';
import type { InboxText } from '../interfaces/whatsapp-engine.interface';

describe('Baileys inbox ingestion', () => {
  it('restores a saved QR-linked identity even when registered is false', () => {
    const sessionsPath = mkdtempSync(join(tmpdir(), 'wagyuu-session-'));
    try {
      const adapter = new BaileysAdapterService(new ConfigService({ storage: { sessionsPath } }));
      const sessionDir = join(sessionsPath, 'sender');
      mkdirSync(sessionDir);
      const file = join(sessionDir, 'creds.json');
      writeFileSync(file, JSON.stringify({ registered: false }));
      expect(adapter.hasSavedAuthentication('sender')).toBe(false);
      writeFileSync(file, JSON.stringify({ registered: false, me: { id: 'linked-device' }, account: {} }));
      expect(adapter.hasSavedAuthentication('sender')).toBe(true);
    } finally {
      rmSync(sessionsPath, { recursive: true });
    }
  });

  it('rejects a send without a connected socket', async () => {
    const config = new ConfigService({ NODE_ENV: 'production', storage: { sessionsPath: tmpdir() } });
    const adapter = new BaileysAdapterService(config);
    await expect(adapter.sendTextMessage('disconnected', '+6281200000001', 'Test message'))
      .resolves.toMatchObject({ status: 'failed' });
  });

  it('keeps new incoming text and omits outgoing OTP and ephemeral content', async () => {
    const adapter = new BaileysAdapterService(new ConfigService({ storage: { sessionsPath: tmpdir() } }));
    const record = jest.fn<Promise<void>, [InboxText]>(async () => {});
    const chat = '6281200000001@s.whatsapp.net';
    const incoming = {
      key: { id: 'incoming', remoteJid: chat, fromMe: false },
      message: { conversation: 'Halo BM' },
      messageTimestamp: 100,
      pushName: 'Member BM',
    };

    await adapter['captureInbox']([
      incoming,
      { ...incoming, key: { ...incoming.key, id: 'otp', fromMe: true } },
      { ...incoming, key: { ...incoming.key, id: 'temporary' }, message: { ephemeralMessage: { message: incoming.message } } },
      { ...incoming, key: { ...incoming.key, id: 'viewonce' }, message: { viewOnceMessage: { message: incoming.message } } },
      { ...incoming, key: { ...incoming.key, id: 'disappearing' }, ephemeralDuration: 86400 },
    ] as unknown as WAMessage[], record);

    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith({
      id: 'incoming', peerId: chat, label: 'Member BM', text: 'Halo BM', sentAt: 100000,
    });
  });

  it('maps synced incoming and outgoing history while omitting OTP and temporary chats', async () => {
    const adapter = new BaileysAdapterService(new ConfigService({ storage: { sessionsPath: tmpdir() } }));
    const record = jest.fn(async () => {});
    const peer = '6281200000001@s.whatsapp.net';
    const temporaryPeer = '6281200000002@s.whatsapp.net';
    const sample = (id: string, text: string, fromMe: boolean, remoteJid = peer): WAMessage => ({
      key: { id, remoteJid, fromMe },
      message: { conversation: text },
      messageTimestamp: 100,
    });

    await adapter['captureHistory']({
      messages: [
        sample('incoming', 'Pesan sebelumnya', false),
        sample('reply', 'Balasan sebelumnya', true),
        sample('otp', 'Kode Anda 1234. Jangan bagikan kode ini.', true),
        sample('ephemeral', 'Pesan sementara', false, temporaryPeer),
      ],
      contacts: [{ id: peer, name: 'Pelanggan BM' }],
      chats: [{ id: temporaryPeer, ephemeralExpiration: 86400 }],
    } as BaileysEventMap['messaging-history.set'], record);

    expect(record).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'incoming', label: 'Pelanggan BM', sentAt: 100000, outgoing: false }),
      expect.objectContaining({ id: 'reply', outgoing: true }),
    ]);
  });
});
