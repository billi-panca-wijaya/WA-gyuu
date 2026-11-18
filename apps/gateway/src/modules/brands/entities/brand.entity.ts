import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiClient } from './api-client.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'domain', nullable: true, length: 255 })
  domain: string | null;

  @Column({ name: 'environment', nullable: true, length: 30, default: 'production' })
  environment: string | null;

  @Column({ name: 'webhook_url', nullable: true, length: 255 })
  webhookUrl: string | null;

  @Column({ name: 'webhook_secret', nullable: true, length: 128 })
  webhookSecret: string | null;

  @Column({ type: 'text', nullable: true })
  config: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ApiClient, (client) => client.brand)
  apiClients: ApiClient[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export { Brand as BrandEntity };
