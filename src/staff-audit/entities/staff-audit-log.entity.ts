import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum StaffAuditOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * Bitácora de auditoría de staff, separada de `audit_log` (genérica, ya
 * usada por flujos de usuario final). Append-only, sin FK en `actorUserId`
 * para sobrevivir a un hard-delete del actor — la retención mínima de 90
 * días es un requisito de seguridad, no debe poder romperse en cascada.
 */
@Index(['actorUserId', 'createdAt'])
@Index(['module', 'action'])
@Entity({ name: 'staff_audit_log' })
export class StaffAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'actor_user_id' })
  actorUserId: string;

  @Column('varchar', { name: 'actor_name', length: 150 })
  actorName: string;

  @Column('varchar', { name: 'actor_role_name', length: 100, nullable: true })
  actorRoleName?: string;

  @Column('varchar', { length: 50 })
  module: string;

  @Column('varchar', { length: 100 })
  action: string;

  @Column('varchar', { name: 'http_method', length: 10, nullable: true })
  httpMethod?: string;

  @Column('varchar', { length: 255, nullable: true })
  route?: string;

  @Column('varchar', { name: 'entity_type', length: 50, nullable: true })
  entityType?: string;

  @Column('varchar', { name: 'entity_id', length: 100, nullable: true })
  entityId?: string;

  @Column('smallint', { name: 'status_code', nullable: true })
  statusCode?: number;

  @Column({
    type: 'enum',
    enum: StaffAuditOutcome,
    enumName: 'staff_audit_log_outcome_enum',
    default: StaffAuditOutcome.SUCCESS,
  })
  outcome: StaffAuditOutcome;

  @Column('varchar', { name: 'ip_address', length: 64, nullable: true })
  ipAddress?: string;

  @Column('varchar', { name: 'user_agent', length: 255, nullable: true })
  userAgent?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column('integer', { name: 'duration_ms', nullable: true })
  durationMs?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
