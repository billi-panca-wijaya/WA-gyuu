import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PlatformUser, PlatformRole, PlatformUserStatus } from './entities/platform-user.entity';
import { PlatformSession } from './entities/platform-session.entity';
import { AuditService } from '../audit/audit.service';

export interface LoginResult {
  sessionToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: PlatformRole;
    mfaEnabled: boolean;
  };
  expiresAt: Date;
}

@Injectable()
export class PlatformAuthService {
  private readonly logger = new Logger(PlatformAuthService.name);

  constructor(
    @InjectRepository(PlatformUser)
    private readonly userRepo: Repository<PlatformUser>,
    @InjectRepository(PlatformSession)
    private readonly sessionRepo: Repository<PlatformSession>,
    private readonly auditService: AuditService,
  ) {}

  hashSessionToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateSession(rawToken: string, _ip?: string): Promise<{ user: PlatformUser; session: PlatformSession } | null> {
    const tokenHash = this.hashSessionToken(rawToken);
    const now = new Date();

    const session = await this.sessionRepo.findOne({
      where: {
        sessionTokenHash: tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      relations: ['user'],
    });

    if (!session || !session.user) {
      return null;
    }

    // Refresh idle expiration (extend 24 hours up to max 30 days from creation)
    const maxSessionLimit = new Date(session.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const idleExtended = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const newExpiry = idleExtended < maxSessionLimit ? idleExtended : maxSessionLimit;

    if (newExpiry.getTime() > session.expiresAt.getTime()) {
      this.sessionRepo.update(session.id, { expiresAt: newExpiry }).catch(() => {});
    }

    return { user: session.user, session };
  }

  async login(identifier: string, password: string, ip: string, userAgent: string): Promise<LoginResult> {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId || !password) {
      throw new BadRequestException('Nama pengguna/email dan kata sandi wajib diisi.');
    }

    const user = await this.userRepo.findOne({
      where: [{ username: cleanId }, { email: cleanId }],
    });

    // Check account lockout
    const now = new Date();
    if (user && user.lockedUntil && new Date(user.lockedUntil) > now) {
      const waitMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - now.getTime()) / 60000);
      await this.auditService.log({
        actorUsername: user.username,
        action: 'auth.login.locked',
        entityType: 'platform_user',
        entityId: user.id,
        details: { reason: 'account_locked', waitMinutes },
        ipAddress: ip,
        status: 'denied',
      });
      throw new ForbiddenException(`Akun terkunci sementara karena beberapa kali salah sandi. Silakan tunggu ${waitMinutes} menit.`);
    }

    // Generic error message to prevent account enumeration
    const invalidCredentialsError = new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Nama pengguna atau kata sandi tidak valid.',
    });

    if (!user) {
      await this.auditService.log({
        actorUsername: cleanId,
        action: 'auth.login.failed',
        entityType: 'platform_user',
        details: { reason: 'user_not_found' },
        ipAddress: ip,
        status: 'failed',
      });
      throw invalidCredentialsError;
    }

    if (user.status !== 'active') {
      await this.auditService.log({
        actorId: user.id,
        actorUsername: user.username,
        action: 'auth.login.suspended',
        entityType: 'platform_user',
        entityId: user.id,
        details: { status: user.status },
        ipAddress: ip,
        status: 'denied',
      });
      throw new ForbiddenException('Akun Anda sedang dinonaktifkan. Hubungi superadmin.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      let lockUntil: Date | null = null;
      if (newAttempts >= 5) {
        lockUntil = new Date(now.getTime() + 15 * 60 * 1000); // lock 15 minutes
      }

      await this.userRepo.update(user.id, {
        failedLoginAttempts: newAttempts,
        lockedUntil: lockUntil,
      });

      await this.auditService.log({
        actorId: user.id,
        actorUsername: user.username,
        action: 'auth.login.failed',
        entityType: 'platform_user',
        entityId: user.id,
        details: { attempts: newAttempts, locked: !!lockUntil },
        ipAddress: ip,
        status: 'failed',
      });

      throw invalidCredentialsError;
    }

    // Reset failed attempts & record login
    await this.userRepo.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      lastLoginIp: ip,
    });

    // Generate random 256-bit session token
    const rawSessionToken = 'ops_' + crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashSessionToken(rawSessionToken);
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours initial idle timeout

    const session = this.sessionRepo.create({
      userId: user.id,
      sessionTokenHash: tokenHash,
      ipAddress: ip,
      userAgent: (userAgent || '').substring(0, 255),
      expiresAt,
      lastElevatedAt: now, // Initial 5 min elevation upon login
    });
    await this.sessionRepo.save(session);

    await this.auditService.log({
      actorId: user.id,
      actorUsername: user.username,
      action: 'auth.login.success',
      entityType: 'platform_user',
      entityId: user.id,
      details: { role: user.role, ip },
      ipAddress: ip,
      status: 'success',
    });

    return {
      sessionToken: rawSessionToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
      expiresAt,
    };
  }

  async logout(sessionId: string, userId: string, username: string, ip: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { revokedAt: new Date() });
    await this.auditService.log({
      actorId: userId,
      actorUsername: username,
      action: 'auth.logout',
      entityType: 'platform_session',
      entityId: sessionId,
      ipAddress: ip,
      status: 'success',
    });
  }

  async reauthenticate(userId: string, sessionId: string, password: string, ip: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await this.auditService.log({
        actorId: user.id,
        actorUsername: user.username,
        action: 'auth.reauth.failed',
        entityType: 'platform_session',
        entityId: sessionId,
        ipAddress: ip,
        status: 'denied',
      });
      throw new UnauthorizedException('Kata sandi salah. Tindakan sensitif dibatalkan.');
    }

    await this.sessionRepo.update(sessionId, { lastElevatedAt: new Date() });
    await this.auditService.log({
      actorId: user.id,
      actorUsername: user.username,
      action: 'auth.reauth.success',
      entityType: 'platform_session',
      entityId: sessionId,
      ipAddress: ip,
      status: 'success',
    });

    return true;
  }

  async bootstrapSuperadmin(data: {
    username: string;
    email: string;
    fullName: string;
    password: string;
  }): Promise<PlatformUser> {
    const count = await this.userRepo.count({ where: { role: 'superadmin' } });
    if (count > 0) {
      throw new ForbiddenException('Superadmin sudah terdaftar. Gunakan alur administrasi portal untuk mengelola pengguna.');
    }

    if (!data.password || data.password.length < 10) {
      throw new BadRequestException('Kata sandi harus minimal 10 karakter.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = this.userRepo.create({
      username: data.username.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      passwordHash,
      role: 'superadmin',
      status: 'active',
    });

    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      actorId: saved.id,
      actorUsername: saved.username,
      action: 'superadmin.bootstrapped',
      entityType: 'platform_user',
      entityId: saved.id,
      details: { role: 'superadmin', username: saved.username },
      ipAddress: '127.0.0.1',
      status: 'success',
    });

    this.logger.log(`Superadmin awal '${saved.username}' berhasil dibuat.`);
    return saved;
  }

  async countSuperadmins(): Promise<number> {
    return this.userRepo.count({ where: { role: 'superadmin', status: 'active' } });
  }

  async listUsers() {
    const users = await this.userRepo.find({
      select: [
        'id',
        'username',
        'email',
        'fullName',
        'role',
        'status',
        'mfaEnabled',
        'lastLoginAt',
        'lastLoginIp',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
    });
    return users;
  }

  async createUser(actor: PlatformUser, data: {
    username: string;
    email: string;
    fullName: string;
    role: PlatformRole;
    password: string;
  }) {
    const existing = await this.userRepo.findOne({
      where: [{ username: data.username.toLowerCase() }, { email: data.email.toLowerCase() }],
    });
    if (existing) {
      throw new BadRequestException('Nama pengguna atau email sudah digunakan.');
    }

    if (!data.password || data.password.length < 10) {
      throw new BadRequestException('Kata sandi harus minimal 10 karakter.');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = this.userRepo.create({
      username: data.username.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      passwordHash,
      role: data.role || 'viewer',
      status: 'active',
    });

    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'user.create',
      entityType: 'platform_user',
      entityId: saved.id,
      details: { role: saved.role, username: saved.username },
      status: 'success',
    });

    return {
      id: saved.id,
      username: saved.username,
      email: saved.email,
      fullName: saved.fullName,
      role: saved.role,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  async updateUser(actor: PlatformUser, id: string, updates: {
    role?: PlatformRole;
    status?: PlatformUserStatus;
    fullName?: string;
  }) {
    const target = await this.userRepo.findOne({ where: { id } });
    if (!target) {
      throw new BadRequestException('Pengguna tidak ditemukan.');
    }

    // Protection: do not allow modifying the last active superadmin to non-superadmin or suspended
    if (target.role === 'superadmin' && (updates.role !== 'superadmin' || updates.status === 'suspended')) {
      const activeSuperadmins = await this.countSuperadmins();
      if (activeSuperadmins <= 1) {
        throw new ForbiddenException('Tidak dapat mengubah atau menangguhkan superadmin aktif terakhir.');
      }
    }

    if (updates.role) target.role = updates.role;
    if (updates.status) target.status = updates.status;
    if (updates.fullName) target.fullName = updates.fullName;

    const saved = await this.userRepo.save(target);

    // If suspended or role changed, revoke all active sessions of this user
    if (updates.status === 'suspended' || updates.role) {
      await this.sessionRepo.update({ userId: target.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    }

    await this.auditService.log({
      actorId: actor.id,
      actorUsername: actor.username,
      action: 'user.update',
      entityType: 'platform_user',
      entityId: target.id,
      details: updates,
      status: 'success',
    });

    return {
      id: saved.id,
      username: saved.username,
      email: saved.email,
      fullName: saved.fullName,
      role: saved.role,
      status: saved.status,
    };
  }
}
