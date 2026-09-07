import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShareAccessReason } from './share-access-reason.enum';
import { ShareResourceType } from './share-resource-type.enum';

/**
 * Auditoría de intentos de acceso a contenido compartido (autorizados y no autorizados).
 * No usa relaciones ManyToOne para no fallar si el token/recurso no existe — el forense
 * de intentos inválidos es justamente lo que este log debe conservar.
 */
@Entity({ name: 'share_access_log' })
@Index(['shareLinkId', 'createdAt'])
@Index(['accessorUserId', 'createdAt'])
@Index(['resourceType', 'resourceId', 'createdAt'])
export class ShareAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'share_link_id', nullable: true })
  shareLinkId?: string | null;

  @Column({ type: 'varchar' })
  token: string;

  @Column({ type: 'enum', enum: ShareResourceType, name: 'resource_type', nullable: true })
  resourceType?: ShareResourceType | null;

  @Column({ type: 'uuid', name: 'resource_id', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'uuid', name: 'accessor_user_id', nullable: true })
  accessorUserId?: string | null;

  @Column({ type: 'varchar', name: 'accessor_musila_creator_id', nullable: true })
  accessorUsername?: string | null;

  @Column({ type: 'boolean' })
  granted: boolean;

  @Column({ type: 'enum', enum: ShareAccessReason })
  reason: ShareAccessReason;

  @Column({ type: 'varchar', name: 'ip_address', nullable: true })
  ipAddress?: string | null;

  @Column({ type: 'varchar', name: 'user_agent', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
