import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MembershipStatus } from './membership-status.enum';
import { Organization } from './organization.entity';

/** Relaciona a un usuario con una organización como miembro de su staff. */
@Entity({ name: 'organization_memberships' })
@Unique(['organizationId', 'userId'])
@Index(['organizationId', 'status'])
export class OrganizationMembership {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ApiProperty({ enum: MembershipStatus, example: MembershipStatus.ACTIVE })
  @Column('varchar', { length: 20, default: MembershipStatus.INVITED })
  status: MembershipStatus;

  @Column('uuid', { name: 'invited_by', nullable: true })
  invitedBy?: string;

  @Column('timestamptz', { name: 'joined_at', nullable: true })
  joinedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
