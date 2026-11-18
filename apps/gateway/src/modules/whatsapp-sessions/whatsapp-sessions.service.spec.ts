import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WhatsAppSessionsService } from './whatsapp-sessions.service';
import { WhatsAppSession } from './entities/whatsapp-session.entity';
import { BaileysAdapterService } from '../../engine-adapters/baileys/baileys-adapter.service';

describe('WhatsAppSessionsService', () => {
  let service: WhatsAppSessionsService;
  let sessionRepo: any;
  let baileysAdapter: any;

  beforeEach(async () => {
    sessionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      remove: jest.fn(),
    };

    baileysAdapter = {
      startSession: jest.fn(),
      stopSession: jest.fn(),
      logoutSession: jest.fn(),
      getQrDataUrl: jest.fn().mockReturnValue('data:image/png;base64,mockqr'),
      sendTextMessage: jest.fn().mockResolvedValue({
        deliveryId: 'del_123',
        status: 'delivered',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppSessionsService,
        {
          provide: getRepositoryToken(WhatsAppSession),
          useValue: sessionRepo,
        },
        {
          provide: BaileysAdapterService,
          useValue: baileysAdapter,
        },
      ],
    }).compile();

    service = module.get<WhatsAppSessionsService>(WhatsAppSessionsService);
  });

  it('should return capabilities correctly', () => {
    const caps = service.getCapabilities();
    expect(caps.pairing_methods).toContain('qr');
    expect(caps.text_test_supported).toBe(true);
    expect(caps.delivery_receipts_supported).toBe(true);
  });

  it('should select eligible sender ordered by lastSuccessfulSendAt', async () => {
    const s1 = { id: 's1', connectionState: 'ready', otpEnabled: true, lastSuccessfulSendAt: new Date(1000) };
    const s2 = { id: 's2', connectionState: 'ready', otpEnabled: true, lastSuccessfulSendAt: new Date(2000) };

    sessionRepo.find.mockResolvedValue([s1, s2]);

    const chosen = await service.selectEligibleSender('brand_1');
    expect(chosen?.id).toBe('s1');
  });
});
