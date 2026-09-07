import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MembershipType } from './membership-type.enum';
import { Role } from './role.entity';

/**
 * Asignación de un rol a una membership (de staff u organización o de
 * roster). A diferencia de `staff_user_roles`, permite múltiples roles por
 * membership (§3: "Un usuario puede tener múltiples roles dentro de una
 * organización").
 */
@Entity({ name: 'membership_roles' })
@Unique(['membershipType', 'membershipId', 'roleId'])
export class MembershipRole {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: MembershipType, example: MembershipType.ORGANIZATION })
  @Column('varchar', { name: 'membership_type', length: 20 })
  membershipType: MembershipType;

  /** FK lógica a organization_memberships o roster_memberships según membershipType. */
  @Index()
  @Column('uuid', { name: 'membership_id' })
  membershipId: string;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column('uuid', { name: 'role_id' })
  roleId: string;

  @Column('uuid', { name: 'assigned_by', nullable: true })
  assignedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
