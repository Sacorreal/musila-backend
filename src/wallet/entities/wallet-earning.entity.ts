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
import { User } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { WalletEarningRole } from './wallet-earning-role.enum';
import { WalletDistributionSource } from './wallet-distribution-source.enum';

/**
 * Ledger append-only de créditos acreditados por venta de licencias. El
 * beneficiario es un `User` (autor/coautor) o una `Organization` (comisión de
 * publisher), y exactamente uno de los dos está presente (CHECK en DB). La
 * idempotencia la garantiza `sourceReference` + beneficiario: el mismo pago no
 * puede acreditar dos veces al mismo beneficiario aunque el evento se reciba
 * más de una vez (índice único de expresión con COALESCE en la migración).
 */
@Entity({ name: 'wallet_earnings' })
export class WalletEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  @Index()
  beneficiary: User | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiary_organization_id' })
  @Index()
  beneficiaryOrganization: Organization | null;

  @ManyToOne(() => RequestedTrack, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_track_id' })
  @Index()
  requestedTrack: RequestedTrack;

  @ManyToOne(() => LicenseContract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'license_contract_id' })
  licenseContract: LicenseContract | null;

  @ManyToOne(() => LicenseCollection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'license_collection_id' })
  licenseCollection: LicenseCollection | null;

  @Column('varchar', { name: 'track_title' })
  trackTitle: string;

  @Column({ type: 'enum', enum: WalletEarningRole })
  role: WalletEarningRole;

  @Column({
    type: 'enum',
    enum: WalletDistributionSource,
    name: 'distribution_source',
  })
  distributionSource: WalletDistributionSource;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'gross_amount' })
  grossAmount: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  percentage: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3, default: 'COP' })
  currency: string;

  @Column('varchar', { name: 'source_reference' })
  sourceReference: string;

  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
