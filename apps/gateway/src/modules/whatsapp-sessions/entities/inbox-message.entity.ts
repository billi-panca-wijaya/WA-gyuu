import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { WhatsAppSession } from './whatsapp-session.entity';

@Entity('whatsapp_inbox_messages')
@Index(['senderId', 'peerId', 'sentAt'])
export class InboxMessage {
  @PrimaryColumn({ name: 'sender_id', type: 'varchar' })
  senderId: string;

  @ManyToOne(() => WhatsAppSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: WhatsAppSession;

  @PrimaryColumn({ name: 'peer_id', type: 'varchar' })
  peerId: string;

  @PrimaryColumn({ name: 'message_id', type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'boolean' })
  outgoing: boolean;

  @Column({ name: 'sent_at', type: 'integer' })
  sentAt: number;
}
