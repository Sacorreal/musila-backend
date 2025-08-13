import { ObjectType, Field, ID } from '@nestjs/graphql';
// import { Track } from 'src/tracks/entities/track.entity';
// import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RequestsStatus } from './requests-status.enum';
import { LicenseType } from './license-type.enum';


@ObjectType()
@Entity({ name: 'requested_track' })
export class RequestedTrack {

  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string

  // @ManyToOne(() => User, user => user.requestedTrack)//TODO: consultar si se hace está relación en la entiedad User
  // @Field(() => User)
  // user: User

  // @ManyToOne(() => Track, track => track.requestedTrack)//TODO: consultar si se hace está relación en la entiedad User
  // @Field(() => Track)
  // track: Track

  // @OneToMany(() => RequestsComment, comment => comment.requestedTrack)
  // @Field(() => [RequestsComment])
  // comments: RequestsComment[]

  @Column({ type: 'enum', enum: RequestsStatus, default: RequestsStatus.PENDIENTE })
  @Field(() => RequestsStatus)
  status: RequestsStatus

  @Column({ type: 'enum', enum: LicenseType })
  @Field(() => LicenseType)
  licenseType: LicenseType

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  @Field()
  createdAt: Date

  @UpdateDateColumn({ name: 'update_at', type: 'timestamptz' })
  @Field()
  updatedAt: Date

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  @Field()
  deletedAt: Date

  @Column({ name: 'approved_by_requester' })
  @Field()
  approvedByRequester: boolean
}
