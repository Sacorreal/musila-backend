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
import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';

/**
 * Configuración por la que una publisher queda automáticamente como coautora de
 * toda canción que publique un usuario concreto de su roster, con un rol y un
 * porcentaje fijos. Es opcional y se define una a una por miembro: el flag
 * `enabled` gatea la inyección. Es configuración mutable; el histórico de cada
 * split queda congelado en `split_author` al crearse el split.
 */
@Entity({ name: 'publisher_roster_coauthor_defaults' })
@Unique(['organizationId', 'userId'])
@Index(['organizationId'])
export class PublisherRosterCoauthorDefault {
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

  @ApiProperty({ example: true, description: 'Si la publisher se inyecta como coautora por defecto.' })
  @Column('boolean', { default: false })
  enabled: boolean;

  @ApiProperty({ enum: CoauthorRole, example: CoauthorRole.COMPOSITOR })
  @Column({ type: 'enum', enum: CoauthorRole, default: CoauthorRole.COMPOSITOR })
  role: CoauthorRole;

  @ApiProperty({ example: 20, description: 'Porcentaje fijo 0–100 que toma la publisher.' })
  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  percentage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
