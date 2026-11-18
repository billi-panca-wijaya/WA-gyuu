import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Brand } from './brand.entity';

@Entity('api_clients')
export class ApiClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.apiClients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 100, default: 'Default API Key' })
  name: string;

  @Column({ length: 30, default: 'production' })
  environment: string;

  @Column({ name: 'key_id', unique: true, length: 64 })
  keyId: string;

  @Column({ name: 'key_hash', length: 128 })
  keyHash: string;

  @Column({ type: 'simple-json', default: '[]' })
  scopes: string[];

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'last_used_at', type: 'datetime', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'rotated_from_key_id', length: 64, nullable: true })
  rotatedFromKeyId: string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
