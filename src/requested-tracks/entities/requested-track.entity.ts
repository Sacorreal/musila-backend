
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LicenseType } from './license-type.enum';
import { RequestsStatus } from './requests-status.enum';

@Entity({ name: 'requested_track' })
export class RequestedTrack {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.requestSent)
  requester: User;

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

  @Column({ type: 'text', nullable: true })
  documentUrl?: string | null;

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
