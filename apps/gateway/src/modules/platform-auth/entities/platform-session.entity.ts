import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PlatformUser } from './platform-user.entity';

@Entity('platform_sessions')
export class PlatformSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => PlatformUser, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: PlatformUser;

  @Column({ name: 'session_token_hash', length: 128, unique: true })
  sessionTokenHash: string;

  @Column({ name: 'ip_address', length: 45, default: '127.0.0.1' })
  ipAddress: string;

  @Column({ name: 'user_agent', length: 255, default: '' })
  userAgent: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'last_elevated_at', type: 'datetime', nullable: true })
  lastElevatedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
