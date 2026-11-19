import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BaileysEventMap, WAMessage } from '@whiskeysockets/baileys';
import {
  InboxHistoryMessage,
  IWhatsAppEngineAdapter,
  SessionCallbacks,
  SessionConnectionState,
} from '../interfaces/whatsapp-engine.interface';
import { isOtpMessage } from '../../modules/otp/otp-message';
import * as path from 'path';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

interface ActiveSession {
  sock?: any;
  state: SessionConnectionState;
  callbacks: SessionCallbacks;
  phoneE164?: string;
  qrDataUrl?: string;
  simulated?: boolean;
}

@Injectable()
export class BaileysAdapterService implements IWhatsAppEngineAdapter {
  private readonly logger = new Logger(BaileysAdapterService.name);
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly sessionsStorageDir: string;

  constructor(private readonly config: ConfigService) {
    this.sessionsStorageDir = this.config.get<string>(
      'storage.sessionsPath',
      path.resolve(__dirname, '../../../../data/sessions'),
    );
    if (!fs.existsSync(this.sessionsStorageDir)) {
      fs.mkdirSync(this.sessionsStorageDir, { recursive: true });
    }
  }

  async startSession(sessionId: string, callbacks: SessionCallbacks): Promise<void> {
    this.logger.log(`Starting WhatsApp session: ${sessionId}`);
    const sessionDir = path.join(this.sessionsStorageDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const currentSession: ActiveSession = {
      state: 'starting',
      callbacks,
    };
    this.sessions.set(sessionId, currentSession);
    callbacks.onStateChange?.('starting');

    try {
      // Dynamic import to prevent crash if native module building is delayed
      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || (baileys as any).makeWASocket;
      const { useMultiFileAuthState, DisconnectReason } = baileys;

      let pinoLogger: any;
      try {
        const pinoMod: any = await import('pino');
        const pinoFn = pinoMod.default || pinoMod;
        pinoLogger = pinoFn({ level: 'silent' });
      } catch {
        const dummy: any = {
          level: 'silent',
          child: () => dummy,
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: () => {},
          error: () => {},
          fatal: () => {},
        };
        pinoLogger = dummy;
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pinoLogger,
        browser: ['WAgyuu Gateway', 'Chrome', '1.0.0'],
        ...(callbacks.onInboxHistory ? { syncFullHistory: false, shouldSyncHistoryMessage: () => true } : {}),
      });

      currentSession.sock = sock;

      sock.ev.on('creds.update', saveCreds);
      const canCapture = () => this.sessions.get(sessionId) === currentSession
        && !['stopped', 'logged_out'].includes(currentSession.state);
      if (callbacks.onInboxText) {
        sock.ev.on('messages.upsert', ({ type, messages }: { type: string; messages: WAMessage[] }) => {
          if (type !== 'notify' || !canCapture()) return;
          void this.captureInbox(messages, callbacks.onInboxText!).catch(() => {
            this.logger.warn('Gagal menyimpan pesan kotak masuk.');
          });
        });
      }

      const recordHistory = callbacks.onInboxHistory;
      if (recordHistory) {
        sock.ev.on('messaging-history.set', (history: BaileysEventMap['messaging-history.set']) => {
          if (!canCapture()) return;
          void this.captureHistory(history, recordHistory).catch(() => {
            this.logger.warn('Gagal menyimpan kelompok riwayat obrolan.');
          });
        });
      }

      sock.ev.on('connection.update', async (update: any) => {
        if (this.sessions.get(sessionId) !== currentSession || ['stopped', 'logged_out'].includes(currentSession.state)) return;
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.logger.log(`New QR generated for session: ${sessionId}`);
          currentSession.state = 'pairing';
          callbacks.onStateChange?.('pairing');
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 256 });
            currentSession.qrDataUrl = qrDataUrl;
            callbacks.onQr?.(qrDataUrl);
          } catch (qrErr) {
            this.logger.error('Failed to generate QR data URL', qrErr);
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id || '';
          const rawNum = userJid.split(':')[0] || userJid.split('@')[0];
          const phoneE164 = rawNum.startsWith('+') ? rawNum : `+${rawNum}`;

          currentSession.state = 'ready';
          currentSession.qrDataUrl = undefined;
          currentSession.phoneE164 = phoneE164;
          this.logger.log(`Session ${sessionId} is READY. Phone: ${phoneE164}`);
          callbacks.onStateChange?.('ready');
          callbacks.onReady?.(phoneE164);
        } else if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;

          if (shouldReconnect) {
            currentSession.state = 'reconnecting';
            callbacks.onStateChange?.('reconnecting');
            this.logger.warn(`Session ${sessionId} disconnected, reconnecting...`);
            void this.startSession(sessionId, callbacks).catch(() => {
              this.logger.warn(`Could not reconnect session ${sessionId}.`);
            });
          } else {
            currentSession.state = 'logged_out';
            currentSession.qrDataUrl = undefined;
            callbacks.onStateChange?.('logged_out');
            this.logger.warn(`Session ${sessionId} logged out from phone.`);
          }
        }
      });
    } catch (err) {
      if (!['development', 'test'].includes(this.config.get<string>('NODE_ENV') ?? '')) {
        currentSession.state = 'failed';
        callbacks.onError?.('Engine WhatsApp gagal dimulai.');
        callbacks.onStateChange?.('failed');
        this.logger.error('Baileys engine could not start.');
        throw new ServiceUnavailableException('Engine WhatsApp gagal dimulai.');
      }
      this.logger.warn('Baileys engine unavailable. Using the development simulation.');
      currentSession.simulated = true;
      currentSession.state = 'pairing';
      callbacks.onStateChange?.('pairing');
      const demoQr = await QRCode.toDataURL(`https://wa.me/qr/WAGYUU_${sessionId}`, { margin: 1, width: 256 });
      currentSession.qrDataUrl = demoQr;
      callbacks.onQr?.(demoQr);
    }
  }

  private async captureInbox(messages: WAMessage[], record: NonNullable<SessionCallbacks['onInboxText']>) {
    for (const message of messages) {
      if (message.key.fromMe) continue;
      const entry = this.inboxMessage(message, undefined, Date.now());
      if (entry) {
        const { outgoing, ...incoming } = entry;
        await record(incoming);
      }
    }
  }

  private async captureHistory(
    history: BaileysEventMap['messaging-history.set'],
    record: NonNullable<SessionCallbacks['onInboxHistory']>,
  ) {
    const names = new Map(history.contacts.map(contact => [contact.id, contact.name || contact.notify]));
    const temporaryChats = new Set<string>();
    for (const chat of history.chats) {
      if (Number(chat.ephemeralExpiration) > 0) temporaryChats.add(chat.id);
      if (chat.name) names.set(chat.id, chat.name);
    }

    const entries: InboxHistoryMessage[] = [];
    for (const message of history.messages) {
      const peer = message.key.remoteJid;
      if (!peer || temporaryChats.has(peer)) continue;
      const entry = this.inboxMessage(message, names.get(peer));
      if (entry) entries.push(entry);
    }
    entries.sort((a, b) => b.sentAt - a.sentAt);
    if (entries.length) await record(entries.slice(0, 2000));
  }

  private inboxMessage(message: WAMessage, name?: string, fallbackTime?: number): InboxHistoryMessage | undefined {
    const { remoteJid, id, fromMe } = message.key;
    if (!remoteJid || !id || !/@(s\.whatsapp\.net|lid|g\.us)$/.test(remoteJid)) return;

    if (Number(message.ephemeralDuration) > 0) return;
    const body = message.message;
    if (!body) return;
    if (
      body.viewOnceMessage ||
      body.viewOnceMessageV2 ||
      body.viewOnceMessageV2Extension ||
      body.ephemeralMessage
    ) {
      return;
    }

    const text = body.conversation ?? body.extendedTextMessage?.text;
    const attachment = body.imageMessage || body.videoMessage || body.audioMessage || body.documentMessage;
    if ((!text?.trim() && !attachment) || (text && isOtpMessage(text))) return;

    const timestamp = Number(message.messageTimestamp) * 1000;
    const sentAt = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallbackTime;
    if (sentAt === undefined) return;

    const address = remoteJid.split('@')[0];
    const label = name?.trim() || (remoteJid.endsWith('@g.us')
      ? 'Grup · ' + address : (!fromMe && message.pushName?.trim()) || address);
    return {
      id, peerId: remoteJid, label: label.slice(0, 120), outgoing: fromMe === true,
      text: text?.trim().slice(0, 4000) || 'Lampiran WhatsApp', sentAt,
    };
  }

  async sendInboxText(sessionId: string, peerId: string, text: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session?.sock || session.state !== 'ready') {
      throw new ServiceUnavailableException('Perangkat WhatsApp belum terhubung.');
    }
    const sent = await session.sock.sendMessage(peerId, { text });
    if (!sent?.key?.id) throw new ServiceUnavailableException('WAgyuu belum menerima ID pesan.');
    return sent.key.id;
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'stopped';
      session.qrDataUrl = undefined;
      session.callbacks.onStateChange?.('stopped');
      try {
        session.sock?.end?.(new Error('Session stopped by admin'));
      } catch (e) {
        // Ignore close error
      }
    }
  }

  async logoutSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'logged_out';
      session.callbacks.onStateChange?.('logged_out');
      try {
        await session.sock?.logout?.();
      } catch (e) {
        // Ignore logout error
      }
    }

    // Clear saved auth directory
    const sessionDir = path.join(this.sessionsStorageDir, sessionId);
    if (fs.existsSync(sessionDir)) {
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (e) {
        this.logger.error(`Failed to delete session dir: ${sessionDir}`, e);
      }
    }
    this.sessions.delete(sessionId);
  }

  async sendTextMessage(
    sessionId: string,
    toPhoneE164: string,
    message: string,
  ): Promise<{ deliveryId: string; status: string }> {
    const session = this.sessions.get(sessionId);
    const deliveryId = 'del_' + uuidv4().replace(/-/g, '').substring(0, 16);

    const cleanNumber = toPhoneE164.replace(/\D/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;

    if (session?.sock && session.state === 'ready') {
      try {
        const sent = await session.sock.sendMessage(jid, { text: message });
        return { deliveryId, status: sent?.key?.id ? 'submitted' : 'failed' };
      } catch {
        this.logger.error(`Send message failed on session ${sessionId}.`);
        return { deliveryId, status: 'failed' };
      }
    }

    return { deliveryId, status: session?.simulated ? 'submitted' : 'failed' };
  }

  canSend(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return Boolean(session?.sock && session.state === 'ready');
  }

  getSessionState(sessionId: string): SessionConnectionState {
    const session = this.sessions.get(sessionId);
    return session?.state || 'created';
  }

  hasSavedAuthentication(sessionId: string): boolean {
    const file = path.join(this.sessionsStorageDir, sessionId, 'creds.json');
    try {
      const creds = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Baileys QR pairing populates the linked identity without setting registered.
      return typeof creds.me?.id === 'string' && creds.me.id !== '' && Boolean(creds.account);
    } catch {
      return false;
    }
  }

  getQrDataUrl(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.qrDataUrl;
  }
}
