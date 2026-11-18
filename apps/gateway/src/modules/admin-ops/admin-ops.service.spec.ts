import { AdminOpsService } from './admin-ops.service';
import * as crypto from 'crypto';

describe('AdminOpsService', () => {
  let service: AdminOpsService;
  let brandRepo: any;
  let clientRepo: any;
  let sessionRepo: any;
  let challengeRepo: any;
  let deliveryRepo: any;
  let auditService: any;

  beforeEach(() => {
    brandRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      save: jest.fn((b) => Promise.resolve({ ...b })),
      create: jest.fn((b) => ({ ...b, id: 'b_123', createdAt: new Date() })),
    };

    clientRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      save: jest.fn((c) => Promise.resolve({ ...c })),
      create: jest.fn((c) => ({ ...c, id: 'k_123', createdAt: new Date() })),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    sessionRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((s) => Promise.resolve({ ...s })),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    challengeRepo = {
      count: jest.fn().mockResolvedValue(5),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    deliveryRepo = {
      count: jest.fn().mockResolvedValue(5),
      createQueryBuilder: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    service = new AdminOpsService(
      brandRepo,
      clientRepo,
      sessionRepo,
      challengeRepo,
      deliveryRepo,
      auditService,
    );
  });

  it('should generate a named API key with scopes and return raw secret once', async () => {
    brandRepo.findOne.mockResolvedValue({
      id: 'b_1',
      code: 'interwin',
      name: 'INTERWIN',
      enabled: true,
    });

    const actor: any = { id: 'u_1', username: 'admin' };
    const result = await service.generateApiKey(actor, {
      brand_id: 'b_1',
      name: 'Production Key',
      scopes: ['otp:create', 'messages:send'],
      expires_in_days: 30,
    });

    expect(result.secret_token).toBeDefined();
    expect(result.secret_token.startsWith('wgy_live_interwin_')).toBe(true);
    expect(result.name).toBe('Production Key');
    expect(clientRepo.save).toHaveBeenCalled();

    // Verify stored entity has sha256 hash, NOT raw secret
    const savedEntity = clientRepo.save.mock.calls[0][0];
    const expectedHash = crypto.createHash('sha256').update(result.secret_token).digest('hex');
    expect(savedEntity.keyHash).toBe(expectedHash);
  });

  it('should rotate an API key with grace period', async () => {
    const oldKey = {
      id: 'k_old',
      keyId: 'key_interwin_111',
      name: 'Old Key',
      scopes: ['otp:create'],
      enabled: true,
      expiresAt: null as Date | null,
      revokedAt: null as Date | null,
      notes: '',
      brand: { id: 'b_1', code: 'interwin' },
    };
    clientRepo.findOne.mockResolvedValue(oldKey);

    const actor: any = { id: 'u_1', username: 'admin' };
    const result = await service.rotateApiKey(actor, 'k_old', {
      grace_period_minutes: 15,
      reason: 'Scheduled rotation',
    });

    expect(result.new_key.secret_token).toBeDefined();
    expect(result.old_key.grace_period_minutes).toBe(15);
    expect(oldKey.expiresAt).toBeDefined();
  });

  it('should revoke an API key permanently', async () => {
    const targetKey = {
      id: 'k_target',
      keyId: 'key_interwin_222',
      enabled: true,
      revokedAt: null,
    };
    clientRepo.findOne.mockResolvedValue(targetKey);

    const actor: any = { id: 'u_1', username: 'admin' };
    const result = await service.revokeApiKey(actor, 'k_target', 'Suspected leak');

    expect(result.status).toBe('revoked');
    expect(targetKey.enabled).toBe(false);
    expect(targetKey.revokedAt).toBeDefined();
  });
});
