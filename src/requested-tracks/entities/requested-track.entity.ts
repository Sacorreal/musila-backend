import { Field, ID, ObjectType } from '@nestjs/graphql';
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

@ObjectType({
  description:
    'Solicitudes enviadas por el usuario para el uso de las canciones',
})
@Entity({ name: 'requested_track' })
export class RequestedTrack {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @ManyToOne(() => User, (user) => user.requestSent)
  @Field(() => User)
  requester: User;

  @ManyToOne(() => Track, (track) => track.requestedTrack)
  @Field(() => Track)
  track: Track;

  @Column({
    type: 'enum',
    enum: RequestsStatus,
    default: RequestsStatus.PENDIENTE,
  })
  @Field(() => RequestsStatus)
  status: RequestsStatus;

  @Column({ type: 'enum', enum: LicenseType })
  @Field(() => LicenseType)
  licenseType: LicenseType;

  @Column({ name: 'approved_by_requester', default: false })
  @Field()
  approvedByRequester: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Field(() => String)
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Field()
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  @Field()
  deletedAt?: Date;
}
