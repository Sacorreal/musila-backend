import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';
import { Organization } from './organization.entity';
import { OrganizationInviteStatus } from './organization-invite-status.enum';

/**
 * Invitación por email para incorporar a un miembro (hoy, el Organization
 * Admin inicial) a una organización cuando el destinatario aún NO tiene
 * cuenta en Musila. Guarda el estado "pendiente" que la membership no puede
 * representar, porque `OrganizationMembership.userId` es NOT NULL: la
 * membership solo se crea al aceptar la invitación (registro o login).
 */
@Entity({ name: 'organization_invites' })
export class OrganizationInvite {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Token único de la invitación' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  token: string;

  @ApiProperty({ description: 'Email del destinatario de la invitación' })
  @Index()
  @Column({ type: 'varchar' })
  email: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  @ApiProperty({ description: 'Rol SYSTEM a asignar al aceptar', example: 'ORGANIZATION_ADMIN' })
  @Column({ type: 'varchar', name: 'role_key', default: 'ORGANIZATION_ADMIN' })
  roleKey: string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.ORGANIZATION })
  @Column({ type: 'varchar', name: 'membership_type', length: 20, default: MembershipType.ORGANIZATION })
  membershipType: MembershipType;

  @ApiProperty({ enum: OrganizationInviteStatus, example: OrganizationInviteStatus.PENDING })
  @Column({ type: 'varchar', length: 20, default: OrganizationInviteStatus.PENDING })
  status: OrganizationInviteStatus;

  @ApiPropertyOptional({ description: 'Staff de Musila que emitió la invitación' })
  @Column('uuid', { name: 'invited_by', nullable: true })
  invitedBy?: string;

  @ApiPropertyOptional({ description: 'Usuario creado/asociado al aceptar la invitación' })
  @Column('uuid', { name: 'accepted_user_id', nullable: true })
  acceptedUserId?: string;

  @ApiProperty({ description: 'Fecha y hora de expiración del token' })
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Fecha en que la invitación fue aceptada' })
  @Column({ type: 'timestamptz', name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
