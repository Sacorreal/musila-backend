import { Guest } from 'src/guests/entities/guest.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255, nullable: true, name: 'second_name' })
  secondName?: string

  @Column('varchar', { name: 'last_name' })
  lastName: string;

  @Column('varchar', { length: 255, nullable: true, name: 'last_second_name' })
  secondLastName?: string

  @Column('varchar', { nullable: false, unique: true })
  email: string;

  @Column('varchar', { nullable: false, select: false })
  password: string;

  @Column('varchar', { name: 'country_code', nullable: true })
  countryCode: string;

  @Column('int', { nullable: true })
  phone: number;

  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  typeCitizenID?: string;

  @Column({ name: 'citizen_id', nullable: true })
  citizenID?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.INVITADO,
  })
  role: UserRole;

  @Column('varchar', { name: 'avatar', nullable: true })
  avatar?: string;

  @Column('boolean', { default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column('text', { nullable: true })
  biography?: string;

  @Column('jsonb', { name: 'social_networks', nullable: true })
  socialNetworks?: Record<string, string>;

  @ManyToMany(() => Track, (track) => track.authors, { nullable: true })
  tracks?: Track[];

  @ManyToMany(() => MusicalGenre, { nullable: true })
  @JoinTable({
    name: 'user_preferred_genres',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'genre_id' },
  })
  preferredGenres?: MusicalGenre[];

  @OneToMany(() => Guest, (guest) => guest.invited_by, { nullable: true })
  guests?: Guest[];

  @OneToMany(() => Playlist, (playlist) => playlist.owner, {
    nullable: true,
    lazy: true,
  })
  playlists?: Playlist[];

  @OneToMany(
    () => RequestedTrack,
    (requestedTrack) => requestedTrack.requester,
    { nullable: true },
  )
  requestSent?: RequestedTrack[];

  @Column('boolean', { default: true, name: 'is_user_free' })
  isUserFree: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
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
