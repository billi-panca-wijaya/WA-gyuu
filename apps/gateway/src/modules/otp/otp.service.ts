import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { OtpDelivery } from './entities/otp-delivery.entity';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ResendChallengeDto } from './dto/resend-challenge.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BrandEntity } from '../brands/entities/brand.entity';
import { WhatsAppSessionsService } from '../whatsapp-sessions/whatsapp-sessions.service';
import { BaileysAdapterService } from '../../engine-adapters/baileys/baileys-adapter.service';

export function maskPhone(phone: string): string {
  if (!phone || phone.length <= 6) return '*'.repeat(phone?.length || 0);
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 3);
  const count = phone.length - 6;
  return `${start}${'*'.repeat(count)}${end}`;
}

@Injectable()
export class OtpService {
  private readonly hmacSecret: string;

  constructor(
    @InjectRepository(OtpChallenge)
    private readonly challengeRepo: Repository<OtpChallenge>,
    @InjectRepository(OtpDelivery)
    private readonly deliveryRepo: Repository<OtpDelivery>,
    private readonly configService: ConfigService,
    private readonly sessionsService: WhatsAppSessionsService,
    private readonly baileysAdapter: BaileysAdapterService,
  ) {
    this.hmacSecret = this.configService.get<string>(
      'security.hmacSecret',
      'wagyuu-default-hmac-secret-change-in-prod-12345678',
    );
  }

  async createChallenge(brand: BrandEntity, dto: CreateChallengeDto) {
    const now = Date.now();

    // Check cooldown on existing challenge for this phone
    const existing = await this.challengeRepo.findOne({
      where: {
        brandId: brand.id,
        phoneE164: dto.phone_e164,
      },
      order: { createdAt: 'DESC' },
    });

    if (existing && existing.state !== 'expired' && existing.state !== 'verified') {
      const resendAt = existing.resendAvailableAt ? existing.resendAvailableAt.getTime() : 0;
      if (resendAt > now) {
        const retryAfter = Math.ceil((resendAt - now) / 1000);
        throw new HttpException(
          {
            code: 'COOLDOWN_ACTIVE',
            message: 'Tunggu sebelum meminta kode baru.',
            retry_after: retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Select eligible sender
    const sender = await this.sessionsService.selectEligibleSender(brand.id);
    if (!sender) {
      throw new HttpException(
        {
          code: 'NO_ELIGIBLE_SENDER',
          message: 'No eligible WhatsApp sender currently available.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const challengeId = crypto.randomBytes(20).toString('hex');
    const purpose = dto.purpose || 'login';
    // 4 random numeric digits strictly
    const code = crypto.randomInt(0, 10000).toString().padStart(4, '0');

    // HMAC verifier binding context
    const codeVerifierHmac = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(`${challengeId}:${brand.id}:${dto.phone_e164}:${purpose}:${code}`)
      .digest('hex');

    const deliveryId = uuidv4();
    const expiresAt = new Date(now + 300 * 1000); // 5 minutes
    const resendAvailableAt = new Date(now + 30 * 1000); // 30s cooldown
    const queueDeadlineAt = new Date(now + 30 * 1000);

    const challenge = this.challengeRepo.create({
      id: challengeId,
      brandId: brand.id,
      phoneE164: dto.phone_e164,
      purpose,
      codeVerifierHmac,
      codePlain: code,
      browserBindingHash: dto.browser_binding || null,
      state: 'pending',
      deliveryStatus: 'submitted',
      attemptCount: 0,
      maxAttempts: 5,
      expiresAt,
      resendAvailableAt,
      queueDeadlineAt,
      senderId: sender.id,
      deliveryId,
    });

    await this.challengeRepo.save(challenge);

    // Create delivery record
    const delivery = this.deliveryRepo.create({
      id: deliveryId,
      challengeId,
      brandId: brand.id,
      senderId: sender.id,
      phoneE164: dto.phone_e164,
      status: 'submitted',
    });
    await this.deliveryRepo.save(delivery);

    // Send WhatsApp OTP message via adapter
    const brandName = brand.name || brand.code || 'WAgyuu';
    const message = `Kode verifikasi ${brandName} Anda adalah *${code}*. Berlaku 5 menit. Demi keamanan akun Anda, jangan bagikan kode ini kepada siapa pun.`;
    try {
      const sendResult = await this.baileysAdapter.sendTextMessage(
        sender.id,
        dto.phone_e164,
        message,
      );
      if (sendResult.status === 'delivered') {
        challenge.deliveryStatus = 'delivered';
        await this.challengeRepo.save(challenge);
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        await this.deliveryRepo.save(delivery);
      }
    } catch (err) {
      delivery.status = 'failed';
      delivery.errorMessage = (err as Error).message;
      await this.deliveryRepo.save(delivery);
    }

    return {
      challenge_id: challenge.id,
      challenge_state: challenge.state,
      delivery_status: challenge.deliveryStatus,
      masked_phone: maskPhone(challenge.phoneE164),
      queue_deadline_at: queueDeadlineAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      ttl_seconds: 300,
      resend_available_at: resendAvailableAt.toISOString(),
    };
  }

  async getChallengeStatus(brandId: string, challengeId: string) {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId, brandId },
    });

    if (!challenge) {
      throw new NotFoundException({
        code: 'CHALLENGE_NOT_FOUND',
        message: 'OTP challenge not found.',
      });
    }

    if (
      challenge.state !== 'verified' &&
      challenge.state !== 'expired' &&
      new Date() > challenge.expiresAt
    ) {
      challenge.state = 'expired';
      await this.challengeRepo.save(challenge);
    }

    return {
      challenge_id: challenge.id,
      challenge_state: challenge.state,
      delivery_status: challenge.deliveryStatus,
      expires_at: challenge.expiresAt.toISOString(),
      resend_available_at: challenge.resendAvailableAt.toISOString(),
      attempts_remaining: Math.max(0, challenge.maxAttempts - challenge.attemptCount),
    };
  }

  async resendChallenge(
    brand: BrandEntity,
    challengeId: string,
    dto: ResendChallengeDto,
  ) {
    const existing = await this.challengeRepo.findOne({
      where: { id: challengeId, brandId: brand.id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'CHALLENGE_NOT_FOUND',
        message: 'OTP challenge not found.',
      });
    }

    const now = Date.now();
    if (existing.resendAvailableAt && existing.resendAvailableAt.getTime() > now) {
      const retryAfter = Math.ceil(
        (existing.resendAvailableAt.getTime() - now) / 1000,
      );
      throw new HttpException(
        {
          code: 'COOLDOWN_ACTIVE',
          message: 'Tunggu sebelum meminta kode baru.',
          retry_after: retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Invalidate previous challenge
    existing.state = 'expired';
    await this.challengeRepo.save(existing);

    return this.createChallenge(brand, {
      phone_e164: existing.phoneE164,
      purpose: existing.purpose,
      browser_binding: dto.browser_binding || existing.browserBindingHash,
    });
  }

  async verifyOtp(brand: BrandEntity, challengeId: string, dto: VerifyOtpDto) {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId, brandId: brand.id },
    });

    if (!challenge) {
      throw new NotFoundException({
        code: 'CHALLENGE_NOT_FOUND',
        message: 'OTP challenge not found.',
      });
    }

    if (challenge.consumedAt || challenge.state === 'verified') {
      throw new BadRequestException({
        code: 'CHALLENGE_ALREADY_CONSUMED',
        message: 'Challenge already consumed.',
      });
    }

    if (challenge.state === 'expired' || new Date() > challenge.expiresAt) {
      challenge.state = 'expired';
      await this.challengeRepo.save(challenge);
      throw new UnauthorizedException({
        code: 'OTP_EXPIRED',
        message: 'Kode telah kedaluwarsa. Silakan minta kode baru.',
      });
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      challenge.state = 'failed';
      await this.challengeRepo.save(challenge);
      throw new UnauthorizedException({
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Batas percobaan terlampaui. Silakan minta kode baru.',
      });
    }

    challenge.attemptCount += 1;

    // Verify code with constant time comparison
    const expectedHmac = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(
        `${challenge.id}:${brand.id}:${challenge.phoneE164}:${challenge.purpose}:${dto.code}`,
      )
      .digest('hex');

    const expectedBuf = Buffer.from(expectedHmac, 'hex');
    const actualBuf = Buffer.from(challenge.codeVerifierHmac, 'hex');

    const isValid =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isValid) {
      await this.challengeRepo.save(challenge);
      const attemptsRemaining = Math.max(
        0,
        challenge.maxAttempts - challenge.attemptCount,
      );
      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        message: 'Kode tidak sesuai.',
        retryable: false,
        attempts_remaining: attemptsRemaining,
      });
    }

    // Success
    const verificationId = uuidv4();
    const verifiedAt = new Date();
    challenge.state = 'verified';
    challenge.consumedAt = verifiedAt;
    challenge.verificationId = verificationId;
    await this.challengeRepo.save(challenge);

    return {
      verification_id: verificationId,
      challenge_id: challenge.id,
      brand_id: brand.id,
      purpose: challenge.purpose,
      phone_e164: challenge.phoneE164,
      browser_binding:
        dto.browser_binding || challenge.browserBindingHash || 'verified',
      verified_at: verifiedAt.toISOString(),
      result_expires_at: new Date(verifiedAt.getTime() + 120 * 1000).toISOString(),
    };
  }

  async getSanitizedLogs(brandId: string, page = 1, limit = 20) {
    const [challenges, total] = await this.challengeRepo.findAndCount({
      where: { brandId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = challenges.map((ch) => ({
      challenge_id: ch.id,
      masked_phone: maskPhone(ch.phoneE164),
      purpose: ch.purpose,
      state: ch.state,
      delivery_status: ch.deliveryStatus,
      attempts: ch.attemptCount,
      sender_id: ch.senderId,
      created_at: ch.createdAt.toISOString(),
      consumed_at: ch.consumedAt ? ch.consumedAt.toISOString() : null,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}
