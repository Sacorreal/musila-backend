import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Bitácora de auditoría de afiliaciones (§13), append-only y desacoplada del
 * ciclo de vida del actor/autor/afiliación (sin FKs — mismo criterio que
 * `StaffAuditLog`: nunca debe romperse por un hard-delete aguas arriba).
 * Se persiste vía `SocietyAffiliationAuditPersistenceListener`, que escucha
 * los eventos `society-affiliation.*` emitidos por `SocietyAffiliationService`.
 */
@Entity({ name: 'society_affiliation_audit_logs' })
@Index(['authorId', 'createdAt'])
@Index(['societyAffiliationId'])
export class SocietyAffiliationAuditLog {
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

  @Column('uuid', { name: 'society_affiliation_id', nullable: true })
  societyAffiliationId: string | null;

  @Column('uuid', { name: 'society_id', nullable: true })
  societyId: string | null;

  @Column('varchar', { name: 'rights_type', nullable: true })
  rightsType: string | null;

  @Column('jsonb', { nullable: true })
  before: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  after: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
