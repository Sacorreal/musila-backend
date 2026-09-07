import { ApiProperty } from '@nestjs/swagger';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LicenseContractSignatory } from './license-contract-signatory.entity';
import { LicenseContractStatus } from './license-contract-status.enum';
import { LicenseContractPaymentStatus } from './license-contract-payment-status.enum';
import { LicenseTerritoryMode } from './license-territory-mode.enum';
import { LicenseDistributionFormat } from './license-distribution-format.enum';

export interface LicenseAdvanceDistributionEntry {
  userId: string;
  percentage: number;
}

/**
 * Contrato de Licencia de Primer Uso generado en línea para una
 * `RequestedTrack`. Captura los términos negociables (sección 3.4 del
 * documento fuente) y orquesta el ciclo de vida del documento: borrador →
 * esperando firmas → firmado → cumplido/expirado.
 */
@Entity({ name: 'license_contract' })
export class LicenseContract {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => RequestedTrack, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_track_id' })
  requestedTrack: RequestedTrack;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  // ── Términos (sección 3.4) ──────────────────────────────────────────────

  @Column({ type: 'timestamptz', name: 'validity_date' })
  validityDate: Date;

  @Column({
    type: 'enum',
    enum: LicenseTerritoryMode,
    name: 'territory_mode',
  })
  territoryMode: LicenseTerritoryMode;

  @Column({ type: 'jsonb', name: 'territory_countries', nullable: true })
  territoryCountries: string[] | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'advance_amount', default: 0 })
  advanceAmount: number;

  @Column({ type: 'varchar', length: 3, name: 'advance_currency', default: 'COP' })
  advanceCurrency: string;

  @Column({ type: 'int', name: 'advance_installments_count', default: 1 })
  advanceInstallmentsCount: number;

  /** Plan de cuotas { amount, dueDate } pactado en el formulario 3.4; se materializa en `LicenseCollection` al completar el contrato. */
  @Column({ type: 'jsonb', name: 'advance_installments', nullable: true })
  advanceInstallments: { amount: number; dueDate: string }[] | null;

  @Column({ type: 'numeric', precision: 5, scale: 4, name: 'commission_rate' })
  commissionRate: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'commission_amount', default: 0 })
  commissionAmount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'total_payable_by_licensee', default: 0 })
  totalPayableByLicensee: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'royalty_percentage' })
  royaltyPercentage: number;

  @Column({ type: 'jsonb', name: 'distribution_formats' })
  distributionFormats: LicenseDistributionFormat[];

  @Column({ type: 'jsonb', name: 'advance_distribution', nullable: true })
  advanceDistribution: LicenseAdvanceDistributionEntry[] | null;

  @Column({ type: 'boolean', name: 'has_custom_info', default: false })
  hasCustomInfo: boolean;

  @Column({ type: 'text', name: 'custom_info', nullable: true })
  customInfo: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'custom_amount', nullable: true })
  customAmount: number | null;

  @Column({ type: 'varchar', length: 3, name: 'custom_currency', nullable: true })
  customCurrency: string | null;

  // ── Estado ───────────────────────────────────────────────────────────────

  @ApiProperty({ enum: LicenseContractStatus })
  @Column({
    type: 'enum',
    enum: LicenseContractStatus,
    default: LicenseContractStatus.DRAFT,
  })
  status: LicenseContractStatus;

  @ApiProperty({ enum: LicenseContractPaymentStatus })
  @Column({
    type: 'enum',
    enum: LicenseContractPaymentStatus,
    name: 'payment_status',
    default: LicenseContractPaymentStatus.APROBADA,
  })
  paymentStatus: LicenseContractPaymentStatus;

  // ── Documento final ──────────────────────────────────────────────────────

  @Column({ type: 'varchar', name: 'document_key', nullable: true })
  documentKey: string | null;

  @Column({ type: 'text', name: 'document_url', nullable: true })
  documentUrl: string | null;

  @Column({ type: 'uuid', name: 'legal_proof_id', nullable: true })
  legalProofId: string | null;

  @Column({ type: 'varchar', name: 'contract_hash', nullable: true })
  contractHash: string | null;

  // ── Firmantes ────────────────────────────────────────────────────────────

  @OneToMany(() => LicenseContractSignatory, (signatory) => signatory.licenseContract, {
    cascade: true,
  })
  signatories: LicenseContractSignatory[];

  // ── Timestamps de ciclo de vida ──────────────────────────────────────────

  @Column({ type: 'timestamptz', name: 'generated_at', nullable: true })
  generatedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'fully_signed_at', nullable: true })
  fullySignedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'fulfilled_at', nullable: true })
  fulfilledAt: Date | null;

  @Column({ type: 'timestamptz', name: 'expired_at', nullable: true })
  expiredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
