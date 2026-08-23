import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShareLink } from './share-link.entity';

@Entity({ name: 'share_authorized_recipient' })
@Index(['shareLink', 'recipientUser'], { unique: true })
export class ShareAuthorizedRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ShareLink, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'share_link_id' })
  shareLink: ShareLink;

  @Index()
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser: User;

  /** Snapshot del username al momento de autorizar (para email/UI aunque el usuario cambie datos). */
  @Column({ type: 'varchar', name: 'recipient_musila_creator_id' })
  recipientUsername: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'granted_by_id' })
  grantedBy: User;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
