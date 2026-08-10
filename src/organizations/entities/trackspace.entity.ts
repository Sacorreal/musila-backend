import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * Workspace de una organización. El branding personalizable (nombre y logo,
 * §2 del requerimiento) vive aquí; cada organización nace con uno default.
 */
@Entity({ name: 'trackspaces' })
export class Trackspace {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Index()
  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  @ApiProperty({ example: 'Sony Music Workspace' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ example: 'https://cdn.musila.com/logos/sony.png', required: false })
  @Column('varchar', { name: 'logo_url', length: 500, nullable: true })
  logoUrl?: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
