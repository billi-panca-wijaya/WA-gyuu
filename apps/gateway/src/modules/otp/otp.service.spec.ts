import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { OtpService, maskPhone } from './otp.service';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { OtpDelivery } from './entities/otp-delivery.entity';
import { WhatsAppSessionsService } from '../whatsapp-sessions/whatsapp-sessions.service';
import { BaileysAdapterService } from '../../engine-adapters/baileys/baileys-adapter.service';
import { BrandEntity } from '../brands/entities/brand.entity';
import * as crypto from 'crypto';

describe('OtpService', () => {
  let service: OtpService;
  let challengeRepo: any;
  let deliveryRepo: any;
  let sessionsService: any;
  let baileysAdapter: any;

  const mockBrand: BrandEntity = {
    id: '6d2ca2f2-1af9-475a-aa10-a97cbeac19d4',
    code: 'interwin',
    name: 'INTERWIN',
    enabled: true,
    domain: null,
    environment: 'test',
    notes: null,
    webhookUrl: '',
    webhookSecret: '',
    config: '{}',
    apiClients: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testHmacSecret = 'test-wagyuu-secret-key-123456';

  beforeEach(async () => {
    challengeRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    deliveryRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    sessionsService = {
      selectEligibleSender: jest.fn().mockResolvedValue({
        id: 's_interwin_01',
        brandId: mockBrand.id,
        connectionState: 'ready',
        otpEnabled: true,
      }),
    };

    baileysAdapter = {
      sendTextMessage: jest.fn().mockResolvedValue({
        deliveryId: 'del_mock_123',
        status: 'delivered',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRepositoryToken(OtpChallenge),
          useValue: challengeRepo,
        },
        {
          provide: getRepositoryToken(OtpDelivery),
          useValue: deliveryRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'security.hmacSecret') return testHmacSecret;
              return undefined;
            }),
          },
        },
        {
          provide: WhatsAppSessionsService,
          useValue: sessionsService,
        },
        {
          provide: BaileysAdapterService,
          useValue: baileysAdapter,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe('maskPhone', () => {
    it('should correctly mask standard Indonesian mobile numbers', () => {
      expect(maskPhone('+62812345678')).toBe('+62******678');
      expect(maskPhone('+628123456789')).toBe('+62*******789');
    });

    it('should handle short inputs safely', () => {
      expect(maskPhone('12345')).toBe('*****');
    });
  });

  describe('createChallenge', () => {
    it('should generate a 4-digit numeric code and valid challenge structure', async () => {
      challengeRepo.findOne.mockResolvedValue(null);

      const res = await service.createChallenge(mockBrand, {
        phone_e164: '+628123456789',
        purpose: 'login',
      });

      expect(res).toBeDefined();
      expect(res.challenge_id).toHaveLength(40);
      expect(res.masked_phone).toBe('+62*******789');
      expect(res.ttl_seconds).toBe(300);
      expect(res.delivery_status).toBe('delivered');

      // Verify delivery call
      expect(baileysAdapter.sendTextMessage).toHaveBeenCalled();
      const calledMessage = baileysAdapter.sendTextMessage.mock.calls[0][2];
      expect(calledMessage).toMatch(/Kode verifikasi .* Anda adalah \*\d{4}\*\./);
    });

    it('should throw 429 when cooldown is active (< 30 seconds)', async () => {
      challengeRepo.findOne.mockResolvedValue({
        id: 'old_challenge',
        state: 'pending',
        resendAvailableAt: new Date(Date.now() + 25 * 1000), // 25s remaining
      });

      await expect(
        service.createChallenge(mockBrand, { phone_e164: '+628123456789' }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 503 when no eligible sender is available', async () => {
      challengeRepo.findOne.mockResolvedValue(null);
      sessionsService.selectEligibleSender.mockResolvedValue(null);

      await expect(
        service.createChallenge(mockBrand, { phone_e164: '+628123456789' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('verifyOtp', () => {
    const challengeId = 'a57d83c0a60c8c6b9ef3417f9484fb134b06c989';
    const correctCode = '1234';
    const wrongCode = '9999';

    const validHmac = crypto
      .createHmac('sha256', testHmacSecret)
      .update(`${challengeId}:${mockBrand.id}:+628123456789:login:${correctCode}`)
      .digest('hex');

    it('should successfully verify with correct 4-digit code', async () => {
      const challenge: Partial<OtpChallenge> = {
        id: challengeId,
        brandId: mockBrand.id,
        phoneE164: '+628123456789',
        purpose: 'login',
        codeVerifierHmac: validHmac,
        attemptCount: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300 * 1000),
        state: 'pending',
      };

      challengeRepo.findOne.mockResolvedValue(challenge);

      const result = await service.verifyOtp(mockBrand, challengeId, {
        code: correctCode,
      });

      expect(result.verification_id).toBeDefined();
      expect(result.challenge_id).toBe(challengeId);
      expect(result.phone_e164).toBe('+628123456789');
      expect(challenge.state).toBe('verified');
      expect(challenge.consumedAt).toBeDefined();
    });

    it('should reject invalid code and decrement remaining attempts', async () => {
      const challenge: Partial<OtpChallenge> = {
        id: challengeId,
        brandId: mockBrand.id,
        phoneE164: '+628123456789',
        purpose: 'login',
        codeVerifierHmac: validHmac,
        attemptCount: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 300 * 1000),
        state: 'pending',
      };

      challengeRepo.findOne.mockResolvedValue(challenge);

      try {
        await service.verifyOtp(mockBrand, challengeId, { code: wrongCode });
        fail('Should have thrown UnauthorizedException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        const res = err.getResponse();
        expect(res.code).toBe('OTP_INVALID');
        expect(res.attempts_remaining).toBe(4);
      }
    });

    it('should reject already consumed challenge with 400', async () => {
      const challenge: Partial<OtpChallenge> = {
        id: challengeId,
        brandId: mockBrand.id,
        phoneE164: '+628123456789',
        purpose: 'login',
        codeVerifierHmac: validHmac,
        consumedAt: new Date(),
        state: 'verified',
      };

      challengeRepo.findOne.mockResolvedValue(challenge);

      await expect(
        service.verifyOtp(mockBrand, challengeId, { code: correctCode }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expired challenge with 401', async () => {
      const challenge: Partial<OtpChallenge> = {
        id: challengeId,
        brandId: mockBrand.id,
        phoneE164: '+628123456789',
        purpose: 'login',
        codeVerifierHmac: validHmac,
        attemptCount: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 1000), // expired 1s ago
        state: 'pending',
      };

      challengeRepo.findOne.mockResolvedValue(challenge);

      await expect(
        service.verifyOtp(mockBrand, challengeId, { code: correctCode }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
