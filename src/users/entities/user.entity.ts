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
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'users' })
export class User {

  @ApiProperty({ example: '', description: '' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { length: 255 })
  name: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { name: 'last_name' })
  lastName: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { nullable: false, unique: true })
  email: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { nullable: false, select: false })
  password: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { name: 'country_code', nullable: true })
  countryCode?: string;

  @ApiProperty({ example: '', description: '' })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  typeCitizenID?: string;

  @ApiProperty({ example: '', description: '' })
  @Column({ name: 'citizen_id', nullable: true })
  citizenID?: string;

  @ApiProperty({ example: '', description: '' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.INVITADO
  })
  role: UserRole;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { name: 'avatar', nullable: true })
  avatar?: string;

  @ApiProperty({ example: '', description: '' })
  @Column('boolean', { default: false, name: 'is_verified' })
  isVerified: boolean;

  @ApiProperty({ example: '', description: '' })
  @Column('text', { nullable: true })
  biography?: string;

  @ApiProperty({ example: '', description: '' })
  @Column('jsonb', { name: 'social_networks', nullable: true })
  socialNetworks?: Record<string, string>;

  @ApiProperty({ example: '', description: '' })
  @ManyToMany(() => Track, (track) => track.authors, { nullable: true })
  tracks?: Track[];

  @ApiProperty({ example: '', description: '' })
  @OneToMany(() => Guest, (guest) => guest.invited_by, { nullable: true })
  guests?: Guest[];

  @ApiProperty({ example: '', description: '' })
  @OneToMany(() => Playlist, (playlist) => playlist.owner, {
    nullable: true,
    lazy: true,
  })
  playlists?: Playlist[];

  @ApiProperty({ example: '', description: '' })
  @OneToMany(
    () => RequestedTrack,
    (requestedTrack) => requestedTrack.requester,
    { nullable: true },
  )
  requestSent?: RequestedTrack[];

  @ApiProperty({ example: '', description: '' })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
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
