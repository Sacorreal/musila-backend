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
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { LicenseCollection } from 'src/license-collections/entities/license-collection.entity';
import { WalletEarningRole } from './wallet-earning-role.enum';
import { WalletDistributionSource } from './wallet-distribution-source.enum';

/**
 * Ledger append-only de créditos acreditados a un usuario por venta de
 * licencias (propias o como coautor). `sourceReference` + `beneficiary`
 * garantizan idempotencia: el mismo pago no puede acreditar dos veces al
 * mismo usuario, aunque el evento que lo origina se reciba más de una vez.
 */
@Entity({ name: 'wallet_earnings' })
@Unique('UQ_wallet_earning_source_beneficiary', ['sourceReference', 'beneficiary'])
export class WalletEarning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiary_user_id' })
  @Index()
  beneficiary: User;

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
