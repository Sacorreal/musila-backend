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
import { ShareResourceType } from './share-resource-type.enum';

@Entity({ name: 'share_link' })
@Index(['resourceType', 'resourceId'])
export class ShareLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'enum', enum: ShareResourceType, name: 'resource_type' })
  resourceType: ShareResourceType;

  @Column({ type: 'uuid', name: 'resource_id' })
  resourceId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'int', name: 'view_count', default: 0 })
  viewCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
