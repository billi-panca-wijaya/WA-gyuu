import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

export interface CreateAuditLogParams {
  actorId?: string | null;
  actorUsername: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string;
  status?: 'success' | 'failed' | 'denied';
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async log(params: CreateAuditLogParams): Promise<AdminAuditLog> {
    try {
      let detailsString: string | null = null;
      if (params.details) {
        if (typeof params.details === 'string') {
          detailsString = params.details;
        } else {
          // Sanitize sensitive fields from log payload
          const sanitized = { ...params.details };
          delete sanitized.password;
          delete sanitized.secret;
          delete sanitized.rawKey;
          delete sanitized.token;
          delete sanitized.code;
          delete sanitized.otp;
          detailsString = JSON.stringify(sanitized);
        }
      }

      const entry = this.auditRepo.create({
        actorId: params.actorId || null,
        actorUsername: params.actorUsername || 'system',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: detailsString,
        ipAddress: params.ipAddress || '127.0.0.1',
        status: params.status || 'success',
      });

      return await this.auditRepo.save(entry);
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
      return null as any;
    }
  }

  async listLogs(query: {
    limit?: number;
    offset?: number;
    category?: 'api' | 'admin' | 'security';
    entityType?: string;
    actorUsername?: string;
  }) {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const qb = this.auditRepo.createQueryBuilder('log');

    if (query.category === 'security') {
      qb.andWhere("log.action LIKE 'auth.%' OR log.action LIKE 'security.%' OR log.status = 'denied'");
    } else if (query.category === 'admin') {
      qb.andWhere("log.action NOT LIKE 'api.%'");
    } else if (query.category === 'api') {
      qb.andWhere("log.action LIKE 'api.%'");
    }

    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }

    if (query.actorUsername) {
      qb.andWhere('log.actorUsername = :actorUsername', { actorUsername: query.actorUsername });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip(offset);
    qb.take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }
}
