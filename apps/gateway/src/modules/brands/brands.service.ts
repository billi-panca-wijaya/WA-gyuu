import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { ApiClient } from './entities/api-client.entity';
import * as crypto from 'crypto';

@Injectable()
export class BrandsService implements OnModuleInit {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(ApiClient)
    private readonly clientRepo: Repository<ApiClient>,
  ) {}

  async onModuleInit() {
    // Start with 0 brands clean state - brands are created on demand via portal or API
  }

  async seedDemoBrand(): Promise<Brand> {
    const brand = this.brandRepo.create({
      code: 'interwin',
      name: 'INTERWIN',
      enabled: true,
      config: JSON.stringify({
        template: 'Kode login :brand Anda: :code. Berlaku :minutes menit. Jangan bagikan kode ini kepada siapa pun.',
      }),
    });
    const saved = await this.brandRepo.save(brand);

    // Seed demo API key for host: "wgy_live_interwin_secret_token"
    const rawKey = 'wgy_live_interwin_secret_token';
    const keyHash = this.hashApiKey(rawKey);

    const client = this.clientRepo.create({
      brandId: saved.id,
      keyId: 'key_interwin_default',
      keyHash,
      scopes: [
        '*',
        'otp:create',
        'otp:read',
        'otp:verify',
        'otp:request',
        'senders:read',
        'senders:write',
        'senders:manage',
        'messages:send',
        'message:test',
        'logs:read',
        'log:read',
      ],
      enabled: true,
    });
    await this.clientRepo.save(client);

    return saved;
  }

  hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async validateApiKey(rawKey: string): Promise<{ brand: Brand; client: ApiClient } | null> {
    const hash = this.hashApiKey(rawKey);
    const client = await this.clientRepo.findOne({
      where: { keyHash: hash, enabled: true },
      relations: ['brand'],
    });

    if (!client || !client.brand || !client.brand.enabled) {
      return null;
    }

    // Check if key is revoked
    if (client.revokedAt) {
      return null;
    }

    // Check if key has expired
    if (client.expiresAt && new Date(client.expiresAt) < new Date()) {
      return null;
    }

    // Update last used timestamp asynchronously
    this.clientRepo.update(client.id, { lastUsedAt: new Date() }).catch(() => {});

    return { brand: client.brand, client };
  }

  async findById(id: string): Promise<Brand | null> {
    return this.brandRepo.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Brand | null> {
    return this.brandRepo.findOne({ where: { code } });
  }

  async updateSettings(id: string, config: string): Promise<void> {
    await this.brandRepo.update(id, { config });
  }
}
