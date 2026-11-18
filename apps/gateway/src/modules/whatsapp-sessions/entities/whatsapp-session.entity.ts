import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';

@Entity('whatsapp_sessions')
export class WhatsAppSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 100 })
  label: string;

  @Column({ name: 'phone_e164', nullable: true, length: 32 })
  phoneE164: string;

  @Column({ name: 'pairing_method', default: 'qr', length: 32 })
  pairingMethod: 'qr' | 'phone_code';

  @Column({
    name: 'connection_state',
    default: 'created',
    length: 32,
  })
  connectionState: string;

  @Column({ name: 'otp_enabled', default: true })
  otpEnabled: boolean;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string;

  @Column({ name: 'qr_expires_at', nullable: true })
  qrExpiresAt: Date;

  @Column({ name: 'last_successful_send_at', nullable: true })
  lastSuccessfulSendAt: Date;

  @Column({ name: 'last_error', nullable: true, length: 255 })
  lastError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
