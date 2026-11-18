import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('otp_challenges')
export class OtpChallenge {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @Column({ name: 'phone_e164' })
  phoneE164: string;

  @Column({ default: 'login' })
  purpose: string;

  @Column({ name: 'code_verifier_hmac' })
  codeVerifierHmac: string;

  @Column({ name: 'code_plain', nullable: true })
  codePlain: string;

  @Column({ name: 'browser_binding_hash', nullable: true })
  browserBindingHash: string;

  @Column({ default: 'queued' })
  state: 'queued' | 'pending' | 'delivered' | 'verified' | 'failed' | 'expired';

  @Column({ name: 'delivery_status', default: 'queued' })
  deliveryStatus: 'queued' | 'submitted' | 'delivered' | 'failed';

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', default: 5 })
  maxAttempts: number;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'resend_available_at', type: 'datetime' })
  resendAvailableAt: Date;

  @Column({ name: 'queue_deadline_at', type: 'datetime', nullable: true })
  queueDeadlineAt: Date;

  @Column({ name: 'consumed_at', type: 'datetime', nullable: true })
  consumedAt: Date;

  @Column({ name: 'verification_id', nullable: true })
  verificationId: string;

  @Column({ name: 'delivery_id', nullable: true })
  deliveryId: string;

  @Column({ name: 'sender_id', nullable: true })
  senderId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
