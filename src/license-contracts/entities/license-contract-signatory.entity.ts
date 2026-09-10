import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { LicenseContract } from './license-contract.entity';
import { LicenseSignatoryRole } from './license-signatory-role.enum';
import { LicenseSignatoryStatus } from './license-signatory-status.enum';

/**
 * Firmante individual de un `LicenseContract` (compositor, cada coautor del
 * split, o el intérprete/licenciatario). Cada uno firma de forma
 * independiente, con evidencia probatoria propia (IP, user-agent, timestamp
 * del servidor), conforme a la Ley 527 de 1999.
 */
@Entity({ name: 'license_contract_signatory' })
@Unique('UQ_license_contract_signatory_user', ['licenseContract', 'user'])
export class LicenseContractSignatory {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LicenseContract, (contract) => contract.signatories, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  licenseContract: LicenseContract;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ enum: LicenseSignatoryRole })
  @Column({ type: 'enum', enum: LicenseSignatoryRole })
  role: LicenseSignatoryRole;

  @ApiProperty({ enum: LicenseSignatoryStatus })
  @Column({
    type: 'enum',
    enum: LicenseSignatoryStatus,
    default: LicenseSignatoryStatus.PENDING,
  })
  status: LicenseSignatoryStatus;

  @Column({ type: 'timestamptz', name: 'signed_at', nullable: true })
  signedAt: Date | null;

  /** Timestamp del servidor cuando el firmante reconoció haber visto el aviso legal (Ley 527, §7), antes de firmar. */
  @Column({ type: 'timestamptz', name: 'warning_acknowledged_at', nullable: true })
  warningAcknowledgedAt: Date | null;

  @Column({ type: 'varchar', name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string | null;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  /** Referencia informativa al SplitAuthor de origen (sin FK física), cuando role = COAUTOR. */
  @Column({ type: 'uuid', name: 'split_author_id', nullable: true })
  splitAuthorId: string | null;

  /** Snapshot cifrado de la identidad legal del firmante en el momento de firmar (Ley 527, §7). */
  @Column({ type: 'text', name: 'legal_identity_snapshot', nullable: true })
  legalIdentitySnapshot: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
