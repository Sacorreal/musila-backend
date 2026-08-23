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
 * Publisher's Share: porcentaje que una publisher configura de forma GLOBAL por
 * cada autor de su roster. Se inyecta como metadata informativa en el expediente
 * de toda canción que ese autor publique (para notificar a entidades externas).
 * Es independiente del split de coautoría: NO consume porcentaje de los coautores
 * humanos ni interviene en ningún cálculo dentro de Musila. El flag `enabled`
 * gatea la inyección. Es configuración mutable.
 */
@Entity({ name: 'publisher_shares' })
@Unique(['organizationId', 'userId'])
@Index(['organizationId'])
export class PublisherShare {
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

  @ApiProperty({ example: true, description: "Si el Publisher's Share se inyecta en las canciones del autor." })
  @Column('boolean', { default: false })
  enabled: boolean;

  @ApiProperty({ example: 20, description: 'Porcentaje informativo 0–100 que declara la publisher.' })
  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  percentage: number;

  @ApiProperty({ example: 'publishing-contracts/uuid.pdf', required: false })
  @Column('varchar', { name: 'contract_key', nullable: true })
  contractKey: string | null;

  @ApiProperty({ example: 'https://cdn.musila.com/...', required: false })
  @Column('text', { name: 'contract_url', nullable: true })
  contractUrl: string | null;

  /**
   * Fecha en la que la editora confirmó esta relación vía el flujo de
   * incorporación al roster (`AccessRequestService.approve` → Flow 2). `null`
   * si el registro solo se editó en bulk desde `/settings/publisher-share`
   * sin pasar por esa confirmación.
   */
  @ApiProperty({ example: '2026-08-23T10:00:00Z', required: false })
  @Column('timestamptz', { name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @Column('uuid', { name: 'confirmed_by_user_id', nullable: true })
  confirmedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
