import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('otp_deliveries')
export class OtpDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'challenge_id' })
  challengeId: string;

  @Column({ name: 'brand_id' })
  brandId: string;

  @Column({ name: 'sender_id', nullable: true })
  senderId: string;

  @Column({ name: 'phone_e164' })
  phoneE164: string;

  @Column({ default: 'queued' })
  status: 'queued' | 'submitted' | 'delivered' | 'failed';

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
