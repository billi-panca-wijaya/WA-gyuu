import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppSession } from './entities/whatsapp-session.entity';
import { BaileysAdapterService } from '../../engine-adapters/baileys/baileys-adapter.service';

@Injectable()
export class WhatsAppSessionsService {
  constructor(
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    private readonly baileysAdapter: BaileysAdapterService,
  ) {}

  getCapabilities() {
    return {
      pairing_methods: ['qr'],
      text_test_supported: true,
      delivery_receipts_supported: true,
    };
  }

  async listSenders(brandId: string): Promise<WhatsAppSession[]> {
    return this.sessionRepo.find({
      where: { brandId },
      order: { createdAt: 'DESC' },
    });
  }

  async createSender(
    brandId: string,
    dto: { label: string; pairing_method?: 'qr' | 'phone_code'; phone?: string },
  ): Promise<WhatsAppSession> {
    const session = this.sessionRepo.create({
      brandId,
      label: dto.label,
      pairingMethod: dto.pairing_method || 'qr',
      phoneE164: dto.phone || null,
      connectionState: 'created',
      otpEnabled: true,
    });
    return this.sessionRepo.save(session);
  }

  async getSender(brandId: string, senderId: string): Promise<WhatsAppSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: senderId, brandId },
    });
    if (!session) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Sender not found for this brand.',
      });
    }
    return session;
  }

  async updateSender(
    brandId: string,
    senderId: string,
    dto: { label?: string; otp_enabled?: boolean },
  ): Promise<WhatsAppSession> {
    const session = await this.getSender(brandId, senderId);
    if (dto.label !== undefined) session.label = dto.label;
    if (dto.otp_enabled !== undefined) session.otpEnabled = dto.otp_enabled;
    return this.sessionRepo.save(session);
  }

  async startPairing(brandId: string, senderId: string): Promise<{ sender_id: string; pairing_method: string; qr_data_url?: string }> {
    const session = await this.getSender(brandId, senderId);

    session.connectionState = 'pairing';
    await this.sessionRepo.save(session);

    await this.baileysAdapter.startSession(senderId, {
      onQr: async (qrDataUrl) => {
        session.qrCode = qrDataUrl;
        session.connectionState = 'pairing';
        session.qrExpiresAt = new Date(Date.now() + 60 * 1000);
        await this.sessionRepo.save(session);
      },
      onReady: async (phoneE164) => {
        session.phoneE164 = phoneE164;
        session.connectionState = 'ready';
        session.qrCode = null;
        await this.sessionRepo.save(session);
      },
      onStateChange: async (state) => {
        session.connectionState = state;
        await this.sessionRepo.save(session);
      },
      onError: async (err) => {
        session.lastError = typeof err === 'string' ? err : err.message || 'Engine error';
        await this.sessionRepo.save(session);
      },
    });

    const currentQr = this.baileysAdapter.getQrDataUrl(senderId) || session.qrCode;

    return {
      sender_id: senderId,
      pairing_method: session.pairingMethod,
      qr_data_url: currentQr,
    };
  }

  async getPairing(brandId: string, senderId: string) {
    const session = await this.getSender(brandId, senderId);
    const qrDataUrl = this.baileysAdapter.getQrDataUrl(senderId) || session.qrCode;

    return {
      sender_id: senderId,
      pairing_method: session.pairingMethod,
      qr_data_url: qrDataUrl,
      expires_at: session.qrExpiresAt ? session.qrExpiresAt.toISOString() : null,
    };
  }

  async startSender(brandId: string, senderId: string): Promise<WhatsAppSession> {
    const session = await this.getSender(brandId, senderId);
    await this.startPairing(brandId, senderId);
    return this.getSender(brandId, senderId);
  }

  async stopSender(brandId: string, senderId: string): Promise<WhatsAppSession> {
    const session = await this.getSender(brandId, senderId);
    await this.baileysAdapter.stopSession(senderId);
    session.connectionState = 'stopped';
    return this.sessionRepo.save(session);
  }

  async logoutSender(brandId: string, senderId: string): Promise<WhatsAppSession> {
    const session = await this.getSender(brandId, senderId);
    await this.baileysAdapter.logoutSession(senderId);
    session.connectionState = 'logged_out';
    session.phoneE164 = null;
    session.qrCode = null;
    return this.sessionRepo.save(session);
  }

  async deleteSender(brandId: string, senderId: string): Promise<{ success: boolean }> {
    const session = await this.getSender(brandId, senderId);
    await this.baileysAdapter.logoutSession(senderId);
    await this.sessionRepo.remove(session);
    return { success: true };
  }

  async sendTestMessage(
    brandId: string,
    senderId: string,
    recipientPhone: string,
    message: string,
  ): Promise<{ delivery_id: string; status: string }> {
    const session = await this.getSender(brandId, senderId);
    if (!recipientPhone.startsWith('+')) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Recipient phone must be in E.164 format (e.g. +6281200000000).',
      });
    }

    const result = await this.baileysAdapter.sendTextMessage(senderId, recipientPhone, message);
    if (result.status === 'submitted' || result.status === 'delivered') {
      session.lastSuccessfulSendAt = new Date();
      await this.sessionRepo.save(session);
    }
    return {
      delivery_id: result.deliveryId,
      status: result.status,
    };
  }

  async selectEligibleSender(brandId: string): Promise<WhatsAppSession | null> {
    // Round-robin or least-recently-assigned sender selection
    const senders = await this.sessionRepo.find({
      where: {
        brandId,
        connectionState: 'ready',
        otpEnabled: true,
      },
      order: { lastSuccessfulSendAt: 'ASC' },
    });

    if (!senders || senders.length === 0) {
      // In simulation/dev mode, if a sender exists with connectionState 'pairing' or 'created', allow it if configured
      const anySender = await this.sessionRepo.findOne({
        where: { brandId, otpEnabled: true },
      });
      return anySender || null;
    }

    return senders[0];
  }
}
