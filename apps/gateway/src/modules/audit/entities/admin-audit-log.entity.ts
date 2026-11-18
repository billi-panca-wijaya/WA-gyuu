import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_username', length: 50, default: 'system' })
  actorUsername: string;

  @Column({ length: 100 })
  action: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', length: 64, nullable: true })
  entityId: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ name: 'ip_address', length: 45, default: '127.0.0.1' })
  ipAddress: string;

  @Column({ length: 20, default: 'success' })
  status: 'success' | 'failed' | 'denied';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
