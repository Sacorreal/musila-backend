import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { AccessRequestStatus } from './access-request-status.enum';
import { Organization } from './organization.entity';
import { WorkspaceInviteLink } from './workspace-invite-link.entity';

/**
 * Solicitud de acceso al workspace generada cuando un invitado completa el
 * registro a través de un `WorkspaceInviteLink`. La cuenta del usuario ya
 * existe (email validado implícitamente por el uso del enlace), pero no tiene
 * membership hasta que el administrador aprueba la solicitud asignándole tipo
 * (staff/roster) y rol.
 */
@Entity({ name: 'organization_access_requests' })
@Index(['organizationId', 'status'])
export class AccessRequest {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => WorkspaceInviteLink, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invite_link_id' })
  inviteLink?: WorkspaceInviteLink;

  @Column('uuid', { name: 'invite_link_id', nullable: true })
  inviteLinkId?: string | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ApiProperty({ enum: AccessRequestStatus, example: AccessRequestStatus.PENDING })
  @Column({ type: 'varchar', length: 20, default: AccessRequestStatus.PENDING })
  status: AccessRequestStatus;

  @ApiPropertyOptional({ description: 'Administrador que resolvió la solicitud' })
  @Column('uuid', { name: 'decided_by', nullable: true })
  decidedBy?: string;

  @ApiPropertyOptional({ description: 'Fecha de resolución (aprobación/rechazo)' })
  @Column({ type: 'timestamptz', name: 'decided_at', nullable: true })
  decidedAt?: Date;

  @ApiPropertyOptional({ description: 'Motivo del rechazo, si aplica' })
  @Column({ type: 'varchar', length: 500, name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Membership creada al aprobar la solicitud' })
  @Column('uuid', { name: 'resulting_membership_id', nullable: true })
  resultingMembershipId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
