import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AffiliateTier } from './affiliate-tier.enum';
import { AffiliateStatus } from './affiliate-status.enum';

export interface AffiliateBankAccount {
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName: string;
  accountHolderIdType: string;
  accountHolderIdNumber: string;
}

@Entity({ name: 'affiliates' })
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255, name: 'last_name' })
  lastName: string;

  @Column('varchar', { nullable: false, unique: true })
  email: string;

  @Column('varchar', { nullable: false, select: false })
  password: string;

  @Column('varchar', { nullable: true })
  phone?: string;

  @Column('varchar', { name: 'country_code', nullable: true })
  countryCode?: string;

  @Column('varchar', { name: 'company_or_brand', nullable: true })
  companyOrBrand?: string;

  @Column('varchar', { nullable: true })
  website?: string;

  @Column('text', { name: 'audience_description', nullable: true })
  audienceDescription?: string;

  @Column('jsonb', { name: 'social_networks', nullable: true })
  socialNetworks?: Record<string, string>;

  @Column('varchar', { name: 'payment_phone', nullable: true })
  paymentPhone?: string;

  @Column('jsonb', { name: 'bank_account', nullable: true })
  bankAccount?: AffiliateBankAccount;

  @Column('varchar', { name: 'referral_code', unique: true })
  referralCode: string;

  @Column({ type: 'enum', enum: AffiliateTier, default: AffiliateTier.STANDARD })
  tier: AffiliateTier;

  @Column({ type: 'enum', enum: AffiliateStatus, default: AffiliateStatus.APPROVED })
  status: AffiliateStatus;

  @Column('timestamptz', { name: 'accepted_terms_at', nullable: true })
  acceptedTermsAt?: Date;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt?: Date;
}
