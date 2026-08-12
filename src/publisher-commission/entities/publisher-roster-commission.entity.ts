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
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { User } from 'src/users/entities/user.entity';

/**
 * Porcentaje de comisión que una publisher cobra a un usuario concreto de su
 * roster. Es configuración mutable: el histórico inmutable de cada pago queda
 * congelado en `RequestedTrack.publisherCommissionSnapshot`.
 */
@Entity({ name: 'publisher_roster_commissions' })
@Unique(['organizationId', 'userId'])
@Index(['organizationId'])
export class PublisherRosterCommission {
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

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ApiProperty({ example: 10, description: 'Porcentaje 0–100' })
  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  percentage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
