import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Guest } from 'src/guests/entities/guest.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity({ name: 'users' })
@ObjectType()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column('varchar', { length: 255 })
  @Field()
  name: string;

  @Column('varchar', { name: 'last_name' })
  @Field()
  lastName: string;

  @Column('varchar', { nullable: false, unique: true })
  @Field()
  email: string;

  @Column('varchar', { nullable: false, select: false })
  @Field()
  password: string;

  @Column('varchar', { name: 'country_code', nullable: true })
  @Field({ nullable: true })
  countryCode?: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  phone?: string;

  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  @Field({ nullable: true })
  typeCitizenID?: string;

  @Column({ name: 'citizen_id', nullable: true })
  @Field({ nullable: true })
  citizenID?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.INVITADO
  })
  @Field(() => UserRole)
  role: UserRole;

  @Column('varchar', { name: 'avatar', nullable: true })
  @Field({ nullable: true })
  avatar?: string;

  @Column('boolean', { default: false, name: 'is_verified' })
  @Field()
  isVerified: boolean;

  @Column('text', { nullable: true })
  @Field({ nullable: true })
  biography?: string;

  @Column('jsonb', { name: 'social_networks', nullable: true })
  @Field(() => [String], { nullable: true })
  socialNetworks?: Record<string, string>;

  @ManyToMany(() => Track, (track) => track.authors, { nullable: true })
  @Field(() => Track, { nullable: true })
  tracks?: Track[];

  @OneToMany(() => Guest, (guest) => guest.invited_by, { nullable: true })
  @Field(() => [Guest], { nullable: true })
  guests?: Guest[];

  @OneToMany(() => Playlist, (playlist) => playlist.owner, {
    nullable: true,
    lazy: true,
  })
  @Field(() => [Playlist], { nullable: true })
  playlists?: Playlist[];

  @OneToMany(
    () => RequestedTrack,
    (requestedTrack) => requestedTrack.requester,
    { nullable: true, lazy: true },
  )
  @Field(() => [RequestedTrack], { nullable: true })
  requestSent?: RequestedTrack[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Field(() => String)
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Field(() => String)
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  @Field(() => String, { nullable: true })
  deletedAt?: Date;
}
