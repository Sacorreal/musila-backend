import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Bitácora de auditoría de la relación editora-autor (Feature 8), append-only
 * y desacoplada del ciclo de vida del actor/autor/organización (sin FKs —
 * mismo criterio que `StaffAuditLog`/`SocietyAffiliationAuditLog`: nunca debe
 * romperse por un hard-delete aguas arriba). Se persiste vía
 * `PublisherShareAuditPersistenceListener`, que escucha los eventos
 * `publisher-share.*` emitidos por `PublisherShareService`.
 */
@Entity({ name: 'publisher_relationship_audit_logs' })
@Index(['authorId', 'createdAt'])
@Index(['publisherShareId'])
export class PublisherRelationshipAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'event_type', length: 60 })
  eventType: string;

  @Column('uuid', { name: 'actor_id' })
  actorId: string;

  @Column('uuid', { name: 'author_id' })
  authorId: string;

  @Column('uuid', { name: 'organization_id', nullable: true })
  organizationId: string | null;

  @Column('uuid', { name: 'publisher_share_id', nullable: true })
  publisherShareId: string | null;

  @Column('jsonb', { nullable: true })
  before: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  after: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
