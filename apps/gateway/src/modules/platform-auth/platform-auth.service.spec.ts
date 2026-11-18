import { PlatformAuthService } from './platform-auth.service';
import * as bcrypt from 'bcryptjs';

describe('PlatformAuthService', () => {
  let service: PlatformAuthService;
  let userRepo: any;
  let sessionRepo: any;
  let auditService: any;

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'u_123', createdAt: new Date() })),
      save: jest.fn((user) => Promise.resolve({ ...user })),
      update: jest.fn().mockResolvedValue(true),
      find: jest.fn().mockResolvedValue([]),
    };

    sessionRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 's_123', createdAt: new Date() })),
      save: jest.fn((session) => Promise.resolve({ ...session })),
      update: jest.fn().mockResolvedValue(true),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(true),
    };

    service = new PlatformAuthService(userRepo, sessionRepo, auditService);
  });

  it('should reject login when user is not found', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login('nonexistent', 'secret12345', '127.0.0.1', 'test-agent')
    ).rejects.toThrow('Nama pengguna atau kata sandi tidak valid.');
  });

  it('should reject login when password is wrong', async () => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('correctpassword', salt);

    userRepo.findOne.mockResolvedValue({
      id: 'u_1',
      username: 'admin',
      passwordHash: hash,
      status: 'active',
      failedLoginAttempts: 0,
    });

    await expect(
      service.login('admin', 'wrongpassword', '127.0.0.1', 'test-agent')
    ).rejects.toThrow('Nama pengguna atau kata sandi tidak valid.');
  });

  it('should authenticate successfully with correct credentials and issue a session', async () => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('correctpassword', salt);

    userRepo.findOne.mockResolvedValue({
      id: 'u_1',
      username: 'superadmin',
      email: 'admin@company.com',
      fullName: 'Super Admin',
      passwordHash: hash,
      role: 'superadmin',
      status: 'active',
      failedLoginAttempts: 0,
    });

    const result = await service.login('superadmin', 'correctpassword', '127.0.0.1', 'test-agent');

    expect(result.sessionToken).toBeDefined();
    expect(result.sessionToken.startsWith('ops_')).toBe(true);
    expect(result.user.username).toBe('superadmin');
    expect(result.user.role).toBe('superadmin');
  });

  it('should prevent deleting or demoting the last active superadmin', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'u_last',
      username: 'last_admin',
      role: 'superadmin',
      status: 'active',
    });
    userRepo.count.mockResolvedValue(1); // Only 1 superadmin

    await expect(
      service.updateUser({ id: 'u_last', username: 'last_admin' } as any, 'u_last', {
        role: 'operator',
      })
    ).rejects.toThrow('Tidak dapat mengubah atau menangguhkan superadmin aktif terakhir.');
  });
});
