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

  @ManyToOne(() => User, (user) => user.requestSent)
  requester: User;

  @ManyToOne(() => User, (user) => user.requestReceived)
  @JoinColumn()
  owner: User;

  @OneToOne(() => Chat, (chat) => chat.request)
  chat?: Chat

  @ManyToOne(() => Track, (track) => track.requestedTrack)
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
