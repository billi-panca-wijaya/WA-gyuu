import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Brand } from '../brands/entities/brand.entity';
import { ApiClient } from '../brands/entities/api-client.entity';
import { WhatsAppSession } from '../whatsapp-sessions/entities/whatsapp-session.entity';
import { OtpChallenge } from '../otp/entities/otp-challenge.entity';
import { OtpDelivery } from '../otp/entities/otp-delivery.entity';
import { AuditService } from '../audit/audit.service';
import { PlatformUser } from '../platform-auth/entities/platform-user.entity';

@Injectable()
export class AdminOpsService {
  private inMemorySettings: any = null;

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(ApiClient)
    private readonly clientRepo: Repository<ApiClient>,
    @InjectRepository(WhatsAppSession)
    private readonly sessionRepo: Repository<WhatsAppSession>,
    @InjectRepository(OtpChallenge)
    private readonly challengeRepo: Repository<OtpChallenge>,
    @InjectRepository(OtpDelivery)
    private readonly deliveryRepo: Repository<OtpDelivery>,
    private readonly auditService: AuditService,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  private getSettingsFilePath(): string {
    const candidates = [
      process.env.SETTINGS_FILE,
      '/app/data/gateway-settings.json',
      path.resolve(process.cwd(), 'data', 'gateway-settings.json'),
      path.resolve(__dirname, '../../../../data/gateway-settings.json'),
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(path.dirname(c))) {
        return c;
      }
    }
    const defaultPath = path.resolve(process.cwd(), 'data', 'gateway-settings.json');
    try {
      fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
    } catch {}
    return defaultPath;
  }

  async getSettings(): Promise<any> {
    if (this.inMemorySettings) {
      return this.inMemorySettings;
    }
    const filePath = this.getSettingsFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        this.inMemorySettings = JSON.parse(raw);
        return this.inMemorySettings;
      } catch {}
    }
    this.inMemorySettings = {
      dbType: 'sqlite',
      dbHost: '127.0.0.1',
      dbPort: '27017',
      dbName: 'wagyuu',
      dbUser: '',
      dbPass: '',
      dbUri: 'mongodb://127.0.0.1:27017/wagyuu',
      sqlitePath: '/app/data/wagyuu.sqlite',
      engineType: 'baileys',
      qrTimeout: '60',
      maxReconnect: '5',
      sessionPath: '/app/data/sessions',
      messageRetention: '1',
      otpLength: '4',
      otpTtl: '300',
      otpCooldown: '30',
      otpMaxAttempts: '5',
      idleTimeout: '1440',
      maxSessionHours: '720',
      elevateWindowMinutes: '15',
      lockoutAttempts: '5',
    };
    return this.inMemorySettings;
  }

  async updateSettings(newSettings: any): Promise<any> {
    const current = await this.getSettings();
    this.inMemorySettings = { ...current, ...newSettings };
    const filePath = this.getSettingsFilePath();
    try {
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(this.inMemorySettings, null, 2), 'utf8');
      console.log(`[AdminOpsService] Successfully persisted settings to ${filePath}`);
    } catch (err: any) {
      console.error(`[AdminOpsService] Failed to persist settings to ${filePath}:`, err.message);
    }
    return this.inMemorySettings;
  }

  // -------------------------------------------------------------
  // Summary & Health
  // -------------------------------------------------------------
  async getSummary() {
    const totalBrands = await this.brandRepo.count();
    const activeBrands = await this.brandRepo.count({ where: { enabled: true } });
    const pausedBrands = totalBrands - activeBrands;

    const totalSenders = await this.sessionRepo.count();
    const readySenders = await this.sessionRepo.count({ where: { connectionState: 'ready' } });

    const totalChallenges = await this.challengeRepo.count();
    const verifiedChallenges = await this.challengeRepo.count({ where: { state: 'verified' } });
    const expiredChallenges = await this.challengeRepo.count({ where: { state: 'expired' } });

    const totalDeliveries = await this.deliveryRepo.count();
    const sentDeliveries = await this.deliveryRepo.count({ where: { status: 'delivered' } });
    const failedDeliveries = await this.deliveryRepo.count({ where: { status: 'failed' } });

    const settings = await this.getSettings();

    return {
      brands: {
        total: totalBrands,
        active: activeBrands,
        paused: pausedBrands,
      },
      senders: {
        total: totalSenders,
        ready: readySenders,
        offline: totalSenders - readySenders,
      },
      otp: {
        total_challenges: totalChallenges,
        verified: verifiedChallenges,
        expired: expiredChallenges,
        verification_rate: totalChallenges > 0 ? Math.round((verifiedChallenges / totalChallenges) * 100) : 0,
      },
      deliveries: {
        total: totalDeliveries,
        sent: sentDeliveries,
        failed: failedDeliveries,
        success_rate: totalDeliveries > 0 ? Math.round((sentDeliveries / totalDeliveries) * 100) : 0,
      },
      system: {
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        node_version: process.version,
        environment: process.env.NODE_ENV || 'production',
        status: 'operational',
        database_driver: settings.dbType || 'sqlite',
      },
    };
  }

  async getSystemHealth() {
    const mem = process.memoryUsage();
    let dbStatus = 'healthy';
    let dbError: string | null = null;
    try {
      await this.brandRepo.count();
    } catch (e: any) {
      dbStatus = 'unhealthy';
      dbError = e.message;
    }

    return {
      process: {
        pid: process.pid,
        uptime_seconds: Math.floor(process.uptime()),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss_mb: Math.round(mem.rss / (1024 * 1024)),
        heap_total_mb: Math.round(mem.heapTotal / (1024 * 1024)),
        heap_used_mb: Math.round(mem.heapUsed / (1024 * 1024)),
      },
      database: {
        type: 'sqlite',
        status: dbStatus,
        error: dbError,
      },
      engine: {
        protocol: 'Baileys Multi-Device (Native WebSocket)',
        status: 'active',
        active_sessions_count: await this.sessionRepo.count({ where: { connectionState: 'ready' } }),
      },
    };
  }

  // -------------------------------------------------------------
  // Brands Management
  // -------------------------------------------------------------
  async listBrands() {
    const brands = await this.brandRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['apiClients'],
    });

    const result = [];
    for (const b of brands) {
      const senderCount = await this.sessionRepo.count({ where: { brandId: b.id } });
      const readySenderCount = await this.sessionRepo.count({ where: { brandId: b.id, connectionState: 'ready' } });
      const activeKeyCount = (b.apiClients || []).filter(c => c.enabled && !c.revokedAt).length;

      // Find last challenge to know last activity
      const lastChallenge = await this.challengeRepo.findOne({
        where: { brandId: b.id },
        order: { createdAt: 'DESC' },
      });

      result.push({
        id: b.id,
        code: b.code,
        name: b.name,
        domain: b.domain,
        environment: b.environment || 'production',
        enabled: b.enabled,
        notes: b.notes,
        sender_count: senderCount,
        ready_sender_count: readySenderCount,
        active_key_count: activeKeyCount,
        last_activity_at: lastChallenge ? lastChallenge.createdAt : null,
        created_at: b.createdAt,
        keys: (b.apiClients || []).map(k => ({
          id: k.id,
          name: k.name,
          key_id: k.keyId,
          environment: k.environment,
          scopes: k.scopes || [],
          enabled: k.enabled,
          status: k.revokedAt
            ? 'revoked'
            : k.expiresAt && new Date(k.expiresAt) < new Date()
            ? 'expired'
            : k.enabled
            ? 'active'
            : 'disabled',
          expires_at: k.expiresAt,
          created_at: k.createdAt,
        })),
      });
    }

    return result;
  }

  async getBrandDetail(id: string) {
    const brand = await this.brandRepo.findOne({
      where: { id },
      relations: ['apiClients'],
    });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan.');

    const senders = await this.sessionRepo.find({
      where: { brandId: id },
      order: { createdAt: 'DESC' },
    });

    const recentChallenges = await this.challengeRepo.find({
      where: { brandId: id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    // Sanitized api clients (no hashes)
    const sanitizedKeys = (brand.apiClients || []).map(k => ({
      id: k.id,
      name: k.name,
      key_id: k.keyId,
      environment: k.environment,
      scopes: k.scopes,
      enabled: k.enabled,
      expires_at: k.expiresAt,
      revoked_at: k.revokedAt,
      last_used_at: k.lastUsedAt,
      created_at: k.createdAt,
      status: k.revokedAt ? 'revoked' : (k.expiresAt && new Date(k.expiresAt) < new Date() ? 'expired' : (k.enabled ? 'active' : 'disabled')),
    }));

    return {
      brand: {
        id: brand.id,
        code: brand.code,
        name: brand.name,
        domain: brand.domain,
        environment: brand.environment,
        enabled: brand.enabled,
        notes: brand.notes,
        created_at: brand.createdAt,
        updated_at: brand.updatedAt,
      },
      keys: sanitizedKeys,
      senders: senders.map(s => ({
        id: s.id,
        label: s.label,
        phone_masked: s.phoneE164 ? this.maskPhone(s.phoneE164) : null,
        connection_state: s.connectionState,
        otp_enabled: s.otpEnabled,
        last_successful_send_at: s.lastSuccessfulSendAt,
        last_error: s.lastError,
        created_at: s.createdAt,
      })),
      recent_otp: recentChallenges.map(c => ({
        id: c.id,
        phone_masked: this.maskPhone(c.phoneE164),
        purpose: c.purpose,
        state: c.state,
        attempts: c.attemptCount,
        expires_at: c.expiresAt,
        created_at: c.createdAt,
      })),
    };
  }

  async createBrand(actor: PlatformUser, dto: {
    code: string;
    name: string;
    domain?: string;
    environment?: string;
    notes?: string;
  }) {
    const cleanCode = dto.code.trim().toLowerCase();
    const existing = await this.brandRepo.findOne({ where: { code: cleanCode } });
    if (existing) {
      throw new BadRequestException(`Kode brand '${cleanCode}' sudah digunakan.`);
    }

    const brand = this.brandRepo.create({
      code: cleanCode,
      name: dto.name.trim(),
      domain: dto.domain ? dto.domain.trim() : null,
      environment: dto.environment || 'production',
      notes: dto.notes ? dto.notes.trim() : null,
      enabled: true,
      config: JSON.stringify({
        template: 'Kode login :brand Anda: :code. Berlaku :minutes menit. Jangan bagikan kode ini.',
      }),
    });

    const saved = await this.brandRepo.save(brand);

    // Auto-generate initial API key for the newly created brand (unified creation)
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawSecret = `wgy_live_${cleanCode}_${randomHex}`;
    const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const keyId = `key_${cleanCode}_${crypto.randomBytes(6).toString('hex')}`;

    const client = this.clientRepo.create({
      brandId: saved.id,
      name: `${saved.name} API Key`,
      keyId,
      keyHash,
      environment: saved.environment || 'production',
      scopes: [
        'otp:create',
        'otp:read',
        'otp:verify',
        'otp:request',
        'senders:read',
        'senders:write',
        'messages:send',
        'logs:read',
      ],
      enabled: true,
      createdByUserId: actor.id,
    });
    const savedClient = await this.clientRepo.save(client);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'brand.create',
      entityType: 'brand',
      entityId: saved.id,
      details: { code: saved.code, name: saved.name, autoKeyId: keyId },
      status: 'success',
    });

    return {
      ...saved,
      initial_api_key: {
        id: savedClient.id,
        key_id: savedClient.keyId,
        name: savedClient.name,
        secret_token: rawSecret, // Revealed only once upon creation
        scopes: savedClient.scopes,
        environment: savedClient.environment,
      },
    };
  }

  async deleteBrand(actor: PlatformUser, id: string) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan.');

    // Delete associated resources
    await this.clientRepo.delete({ brandId: id });
    await this.sessionRepo.delete({ brandId: id });
    await this.challengeRepo.delete({ brandId: id });
    await this.brandRepo.delete({ id });

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'brand.delete',
      entityType: 'brand',
      entityId: id,
      details: { code: brand.code, name: brand.name },
      status: 'success',
    });

    return { deleted: true };
  }

  async updateBrand(actor: PlatformUser, id: string, dto: {
    name?: string;
    domain?: string;
    environment?: string;
    notes?: string;
  }) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan.');

    if (dto.name) brand.name = dto.name.trim();
    if (dto.domain !== undefined) brand.domain = dto.domain ? dto.domain.trim() : null;
    if (dto.environment) brand.environment = dto.environment;
    if (dto.notes !== undefined) brand.notes = dto.notes ? dto.notes.trim() : null;

    const saved = await this.brandRepo.save(brand);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'brand.update',
      entityType: 'brand',
      entityId: saved.id,
      details: dto,
      status: 'success',
    });

    return saved;
  }

  async setBrandStatus(actor: PlatformUser, id: string, enabled: boolean) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan.');

    brand.enabled = enabled;
    await this.brandRepo.save(brand);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: enabled ? 'brand.resume' : 'brand.pause',
      entityType: 'brand',
      entityId: brand.id,
      details: { enabled },
      status: 'success',
    });

    return { id: brand.id, code: brand.code, enabled: brand.enabled };
  }

  // -------------------------------------------------------------
  // API Credentials (Key Lifecycle: Named, Scoped, One-Time Reveal, Rotate, Revoke)
  // -------------------------------------------------------------
  async listApiKeys(brandId?: string) {
    const qb = this.clientRepo.createQueryBuilder('client')
      .leftJoinAndSelect('client.brand', 'brand')
      .orderBy('client.createdAt', 'DESC');

    if (brandId) {
      qb.andWhere('client.brandId = :brandId', { brandId });
    }

    const keys = await qb.getMany();
    return keys.map(k => {
      let status = 'active';
      if (k.revokedAt) status = 'revoked';
      else if (k.expiresAt && new Date(k.expiresAt) < new Date()) status = 'expired';
      else if (!k.enabled) status = 'disabled';
      else if (k.brand && !k.brand.enabled) status = 'brand_paused';

      return {
        id: k.id,
        name: k.name,
        brand_id: k.brandId,
        brand_code: k.brand ? k.brand.code : '',
        brand_name: k.brand ? k.brand.name : '',
        key_id: k.keyId,
        environment: k.environment,
        scopes: k.scopes || [],
        enabled: k.enabled,
        status,
        expires_at: k.expiresAt,
        revoked_at: k.revokedAt,
        last_used_at: k.lastUsedAt,
        rotated_from_key_id: k.rotatedFromKeyId,
        notes: k.notes,
        created_at: k.createdAt,
      };
    });
  }

  async generateApiKey(actor: PlatformUser, dto: {
    brand_id: string;
    name: string;
    environment?: string;
    scopes: string[];
    expires_in_days?: number;
    notes?: string;
  }) {
    const brand = await this.brandRepo.findOne({ where: { id: dto.brand_id } });
    if (!brand) throw new NotFoundException('Brand tidak ditemukan.');

    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Nama kredensial wajib diisi.');
    }

    // Default scopes allowlist (avoid '*' by default)
    const allowedScopes = [
      'otp:create',
      'otp:read',
      'otp:verify',
      'otp:request',
      'senders:read',
      'senders:write',
      'messages:send',
      'logs:read',
    ];

    const selectedScopes = (dto.scopes && dto.scopes.length > 0)
      ? dto.scopes.filter(s => allowedScopes.includes(s) || s === '*')
      : ['otp:create', 'otp:read', 'otp:verify', 'senders:read', 'messages:send'];

    // Generate random secret token: wgy_live_<random_bytes>
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawSecret = `wgy_live_${brand.code}_${randomHex}`;
    const keyHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const keyId = `key_${brand.code}_${crypto.randomBytes(6).toString('hex')}`;

    let expiresAt: Date | null = null;
    if (dto.expires_in_days && dto.expires_in_days > 0) {
      expiresAt = new Date(Date.now() + dto.expires_in_days * 24 * 60 * 60 * 1000);
    }

    const client = this.clientRepo.create({
      brandId: brand.id,
      name: dto.name.trim(),
      environment: dto.environment || 'production',
      keyId,
      keyHash,
      scopes: selectedScopes,
      enabled: true,
      expiresAt,
      createdByUserId: actor.id,
      notes: dto.notes ? dto.notes.trim() : null,
    });

    const saved = await this.clientRepo.save(client);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'key.create',
      entityType: 'api_client',
      entityId: saved.id,
      details: {
        keyId: saved.keyId,
        brandCode: brand.code,
        name: saved.name,
        scopes: saved.scopes,
        expiresAt: saved.expiresAt,
      },
      status: 'success',
    });

    // Return plaintext key ONCE
    return {
      id: saved.id,
      key_id: saved.keyId,
      name: saved.name,
      brand_code: brand.code,
      scopes: saved.scopes,
      expires_at: saved.expiresAt,
      // Plaintext raw token returned ONLY once
      secret_token: rawSecret,
      instruction: `Salin dan tempelkan token ini ke .env Laravel host brand (${brand.code}): WAGYUU_API_KEY=${rawSecret}`,
      warning: 'Nilai secret ini hanya ditampilkan satu kali dan tidak disimpan dalam format plaintext di server.',
    };
  }

  async rotateApiKey(actor: PlatformUser, keyId: string, options: {
    grace_period_minutes?: number; // e.g. 15 mins for planned rotation, 0 for immediate cutover
    reason?: string;
  }) {
    const existing = await this.clientRepo.findOne({
      where: { id: keyId },
      relations: ['brand'],
    });
    if (!existing) throw new NotFoundException('Kredensial tidak ditemukan.');
    if (existing.revokedAt) {
      throw new BadRequestException('Kredensial yang sudah dicabut tidak dapat dirotasi.');
    }

    const brand = existing.brand;

    // 1. Generate new replacement key
    const randomHex = crypto.randomBytes(24).toString('hex');
    const newRawSecret = `wgy_live_${brand.code}_${randomHex}`;
    const newKeyHash = crypto.createHash('sha256').update(newRawSecret).digest('hex');
    const newKeyId = `key_${brand.code}_${crypto.randomBytes(6).toString('hex')}`;

    const newClient = this.clientRepo.create({
      brandId: brand.id,
      name: `${existing.name} (Rotated)`,
      environment: existing.environment,
      keyId: newKeyId,
      keyHash: newKeyHash,
      scopes: existing.scopes,
      enabled: true,
      expiresAt: existing.expiresAt,
      rotatedFromKeyId: existing.keyId,
      createdByUserId: actor.id,
      notes: `Dirotasi dari ${existing.keyId}. Alasan: ${options.reason || 'Rotasi berkala'}`,
    });
    const savedNew = await this.clientRepo.save(newClient);

    // 2. Set expiry or immediate revocation on old key
    const graceMinutes = options.grace_period_minutes !== undefined ? options.grace_period_minutes : 15;
    if (graceMinutes > 0) {
      existing.expiresAt = new Date(Date.now() + graceMinutes * 60 * 1000);
      existing.notes = (existing.notes || '') + ` | Dirotasi ke ${newKeyId} dengan masa tenggang ${graceMinutes} menit.`;
    } else {
      existing.revokedAt = new Date();
      existing.enabled = false;
      existing.notes = (existing.notes || '') + ` | Dicabut langsung digantikan ${newKeyId}.`;
    }
    await this.clientRepo.save(existing);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'key.rotate',
      entityType: 'api_client',
      entityId: existing.id,
      details: {
        oldKeyId: existing.keyId,
        newKeyId: savedNew.keyId,
        graceMinutes,
        reason: options.reason || 'planned_rotation',
      },
      status: 'success',
    });

    return {
      new_key: {
        id: savedNew.id,
        key_id: savedNew.keyId,
        name: savedNew.name,
        brand_code: brand.code,
        secret_token: newRawSecret,
        instruction: `Perbarui konfigurasi host Laravel: WAGYUU_API_KEY=${newRawSecret}`,
        warning: 'Simpan token baru sekarang. Nilai ini tidak dapat dilihat lagi.',
      },
      old_key: {
        key_id: existing.keyId,
        grace_period_minutes: graceMinutes,
        valid_until: existing.expiresAt,
      },
    };
  }

  async revokeApiKey(actor: PlatformUser, keyId: string, reason: string) {
    const existing = await this.clientRepo.findOne({ where: { id: keyId } });
    if (!existing) throw new NotFoundException('Kredensial tidak ditemukan.');

    existing.revokedAt = new Date();
    existing.enabled = false;
    existing.notes = (existing.notes || '') + ` | Dicabut permanen oleh ${actor.username}: ${reason || 'Revocation'}`;
    await this.clientRepo.save(existing);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'key.revoke',
      entityType: 'api_client',
      entityId: existing.id,
      details: { keyId: existing.keyId, reason },
      status: 'success',
    });

    return {
      id: existing.id,
      key_id: existing.keyId,
      status: 'revoked',
      revoked_at: existing.revokedAt,
    };
  }

  async updateApiKey(actor: PlatformUser, keyId: string, dto: { name?: string; notes?: string }) {
    const existing = await this.clientRepo.findOne({ where: { id: keyId } });
    if (!existing) throw new NotFoundException('Kredensial tidak ditemukan.');

    if (dto.name) existing.name = dto.name.trim();
    if (dto.notes !== undefined) existing.notes = dto.notes ? dto.notes.trim() : null;
    await this.clientRepo.save(existing);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'key.update',
      entityType: 'api_client',
      entityId: existing.id,
      details: dto,
      status: 'success',
    });

    return existing;
  }

  // -------------------------------------------------------------
  // WhatsApp Sessions Monitoring & Actions
  // -------------------------------------------------------------
  async listSenders(brandId?: string) {
    const qb = this.sessionRepo.createQueryBuilder('sender')
      .leftJoinAndSelect('sender.brand', 'brand')
      .orderBy('sender.createdAt', 'DESC');

    if (brandId) {
      qb.andWhere('sender.brandId = :brandId', { brandId });
    }

    const senders = await qb.getMany();
    return senders.map(s => ({
      id: s.id,
      brand_id: s.brandId,
      brand_code: s.brand ? s.brand.code : '',
      brand_name: s.brand ? s.brand.name : '',
      label: s.label,
      phone_masked: s.phoneE164 ? this.maskPhone(s.phoneE164) : null,
      connection_state: s.connectionState,
      otp_enabled: s.otpEnabled,
      last_successful_send_at: s.lastSuccessfulSendAt,
      last_error: s.lastError,
      created_at: s.createdAt,
    }));
  }

  async senderAction(actor: PlatformUser, senderId: string, action: 'disconnect' | 'toggle_otp', reason?: string) {
    const sender = await this.sessionRepo.findOne({ where: { id: senderId }, relations: ['brand'] });
    if (!sender) throw new NotFoundException('Sender tidak ditemukan.');

    if (action === 'toggle_otp') {
      sender.otpEnabled = !sender.otpEnabled;
      await this.sessionRepo.save(sender);
    } else if (action === 'disconnect') {
      sender.connectionState = 'disconnected';
      await this.sessionRepo.save(sender);
    }

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: `sender.${action}`,
      entityType: 'whatsapp_session',
      entityId: sender.id,
      details: { brandCode: sender.brand?.code, action, reason },
      status: 'success',
    });

    return { id: sender.id, state: sender.connectionState, otp_enabled: sender.otpEnabled };
  }

  // -------------------------------------------------------------
  // OTP Transactions & Queue Monitoring
  // -------------------------------------------------------------
  async listOtpTransactions(query: { brandId?: string; limit?: number; offset?: number }) {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const qb = this.challengeRepo.createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    if (query.brandId) {
      qb.andWhere('c.brandId = :brandId', { brandId: query.brandId });
    }

    const [items, total] = await qb.getManyAndCount();
    const brands = await this.brandRepo.find();
    const brandMap = new Map(brands.map(b => [b.id, b.code]));

    const formatted = items.map(c => {
      return {
        id: c.id,
        brand_code: brandMap.get(c.brandId) || '',
        phone_masked: this.maskPhone(c.phoneE164),
        purpose: c.purpose,
        challenge_state: c.state,
        attempts: c.attemptCount,
        max_attempts: c.maxAttempts,
        expires_at: c.expiresAt,
        delivery_state: c.deliveryStatus,
        sender_id: c.senderId,
        created_at: c.createdAt,
      };
    });

    return { items: formatted, total, limit, offset };
  }

  async listDeliveriesQueue(query: { limit?: number; offset?: number }) {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const qb = this.deliveryRepo.createQueryBuilder('d')
      .orderBy('d.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(d => ({
        id: d.id,
        challenge_id: d.challengeId,
        sender_id: d.senderId,
        status: d.status,
        error_message: d.errorMessage,
        delivered_at: d.deliveredAt,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      })),
      total,
      limit,
      offset,
    };
  }

  // Helper phone masking
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '******';
    const start = phone.substring(0, 3);
    const end = phone.substring(phone.length - 3);
    return `${start}******${end}`;
  }
}
