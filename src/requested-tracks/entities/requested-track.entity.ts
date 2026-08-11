import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LicenseType } from './license-type.enum';
import { LicensePaymentStatus } from './license-payment-status.enum';
import { RequestsStatus } from './requests-status.enum';
import { Chat } from 'src/chat/entities/chat.entity';


@Entity({ name: 'requested_track' })
export class RequestedTrack {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.requestSent, { onDelete: 'CASCADE' })
  requester: User;

  @ManyToOne(() => User, (user) => user.requestReceived, { onDelete: 'CASCADE' })
  @JoinColumn()
  owner: User;

  @OneToOne(() => Chat, (chat) => chat.request)
  chat?: Chat

  @ManyToOne(() => Track, (track) => track.requestedTrack, { onDelete: 'CASCADE' })
  track: Track;

  @Column({
    type: 'enum',
    enum: RequestsStatus,
    default: RequestsStatus.PENDIENTE,
  })
  status: RequestsStatus;

  @Column({ type: 'enum', enum: LicenseType })
  licenseType: LicenseType;

  @Column({ name: 'approved_by_requester', default: false })
  approvedByRequester: boolean;

  @Column({ name: 'approved_by_owner', default: false })
  approvedByOwner: boolean;

  @Column({ type: 'text', nullable: true })
  documentUrl?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, name: 'license_price' })
  licensePrice: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'license_price_set_at' })
  licensePriceSetAt: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'license_payment_reference' })
  licensePaymentReference: string | null;

  @Column({
    type: 'enum',
    enum: LicensePaymentStatus,
    default: LicensePaymentStatus.NONE,
    name: 'license_payment_status',
  })
  licensePaymentStatus: LicensePaymentStatus;

  // ─── Snapshot de comisión B2B congelada (§13) ────────────────────────────
  // Se resuelve y congela cuando el comprador (organización LABEL/MANAGEMENT)
  // formaliza el pago. Es inmutable: un cambio posterior de plan o de tarifa
  // en Admin no altera estos valores (§21). Nulo en compras de usuarios
  // personales, que no usan el mecanismo B2B de este requerimiento.

  @Column({ type: 'uuid', nullable: true, name: 'buyer_organization_id' })
  buyerOrganizationId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'buyer_plan_id' })
  buyerPlanId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'buyer_subscription_id' })
  buyerSubscriptionId: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, name: 'commission_rate' })
  commissionRate: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true, name: 'commission_amount' })
  commissionAmount: number | null;

  @Column({ type: 'varchar', length: 3, nullable: true, name: 'commission_currency' })
  commissionCurrency: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'commission_resolved_at' })
  commissionResolvedAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
