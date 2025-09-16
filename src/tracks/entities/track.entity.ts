//TODO: Agregar como atributos los metadatos que vienen como respuesta del servicio de alojamiento "Digital Ocean Spaces"

import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExternalId } from './external-id.entity';

@Entity({ name: 'track' })
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { nullable: false })
  title: string;

  @ManyToOne(() => MusicalGenre, (musicalGenre) => musicalGenre.tracks, {
    onDelete: 'CASCADE',
    eager: false,
    nullable: false,
  })
  genre: MusicalGenre;

  @Column('varchar', { name: 'sub_genre', nullable: true })
  subGenre?: string;

  //TODO: agregar url del logo de la app por default
  @Column({ type: 'varchar', default: 'urllogoapp.img', nullable: false })
  cover?: string;

  @Column('varchar', { nullable: false })
  url: string;

  @Column('int', { nullable: false })
  year: number;

  @Column('varchar', { nullable: false })
  language: string;

  @Column('varchar', { nullable: false })
  lyric: string;

  @Column('jsonb', { name: 'externals_ids', nullable: true })
  externalsIds?: ExternalId[]

  @OneToMany(() => IntellectualProperty, (it) => it.track)
  intellectualProperties: IntellectualProperty[];

  @Column('boolean', { default: true, name: 'is_available' })
  isAvailable: boolean;

  @ManyToMany(() => User, (user) => user.tracks, { nullable: false })
  @JoinTable()
  authors: User[];

  @ManyToMany(() => Playlist, (playlist) => playlist.tracks, {
    nullable: true,
    lazy: true,
  })
  playlists?: Playlist[];

  @Column('boolean', { default: false, name: 'is_gospel' })
  isGospel: boolean;

  @OneToMany(() => RequestedTrack, (requestedTrack) => requestedTrack.track, {
    nullable: true,
    lazy: true,
  })
  requestedTrack?: RequestedTrack[];

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
