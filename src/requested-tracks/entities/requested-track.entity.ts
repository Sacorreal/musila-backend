
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
import { ApiProperty } from '@nestjs/swagger';


@Entity({ name: 'requested_track' })
export class RequestedTrack {

  @ApiProperty({ example: '', description: '' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '', description: '' })
  @ManyToOne(() => User, (user) => user.requestSent)
  requester: User;

  @ApiProperty({ example: '', description: '' })
  @ManyToOne(() => Track, (track) => track.requestedTrack)
  track: Track;

  @ApiProperty({ example: '', description: '' })
  @Column({
    type: 'enum',
    enum: RequestsStatus,
    default: RequestsStatus.PENDIENTE,
  })
  status: RequestsStatus;

  @ApiProperty({ example: '', description: '' })
  @Column({ type: 'enum', enum: LicenseType })
  licenseType: LicenseType;

  @ApiProperty({ example: '', description: '' })
  @Column({ name: 'approved_by_requester', default: false })
  approvedByRequester: boolean;

  @ApiProperty({ example: '', description: '' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty({ example: '', description: '' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ApiProperty({ example: '', description: '' })
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
