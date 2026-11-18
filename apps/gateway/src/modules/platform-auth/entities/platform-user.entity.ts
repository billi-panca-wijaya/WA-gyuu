import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PlatformSession } from './platform-session.entity';

export type PlatformRole = 'superadmin' | 'operator' | 'viewer';
export type PlatformUserStatus = 'active' | 'suspended';

@Entity('platform_users')
export class PlatformUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 120 })
  email: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 20, default: 'viewer' })
  role: PlatformRole;

  @Column({ length: 20, default: 'active' })
  status: PlatformUserStatus;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', length: 255, nullable: true })
  mfaSecret: string | null;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'last_login_ip', length: 45, nullable: true })
  lastLoginIp: string | null;

  @OneToMany(() => PlatformSession, (session) => session.user)
  sessions: PlatformSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
