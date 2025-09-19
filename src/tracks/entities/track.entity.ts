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
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'track' })
export class Track {

  @ApiProperty({ example: '', description: '' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { nullable: false })
  title: string;

  @ApiProperty({ example: '', description: '' })
  @ManyToOne(() => MusicalGenre, (musicalGenre) => musicalGenre.tracks, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  genre: MusicalGenre;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { name: 'sub_genre', nullable: true })
  subGenre?: string;

  //TODO: agregar url del logo de la app por default
  @ApiProperty({ example: '', description: '' })
  @Column({ type: 'varchar', default: 'urllogoapp.img', nullable: false })
  cover?: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { nullable: false })
  url: string;

  @ApiProperty({ example: '', description: '' })
  @Column('int', { nullable: false })
  year: number;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { nullable: false })
  language: string;

  @ApiProperty({ example: '', description: '' })
  @Column('varchar', { nullable: false })
  lyric: string;

  @ApiProperty({ example: '', description: '' })
  @Column('jsonb', { name: 'externals_ids', nullable: true })
  externalsIds?: ExternalId[]

  @ApiProperty({ example: '', description: '' })
  @OneToMany(() => IntellectualProperty, (it) => it.track)
  intellectualProperties: IntellectualProperty[];

  @ApiProperty({ example: '', description: '' })
  @Column('boolean', { default: true, name: 'is_available' })
  isAvailable: boolean;

  @ApiProperty({ example: '', description: '' })
  @ManyToMany(() => User, (user) => user.tracks, { nullable: false })
  @JoinTable()
  authors: User[];

  @ApiProperty({ example: '', description: '' })
  @ManyToMany(() => Playlist, (playlist) => playlist.tracks, {
    nullable: true,
    lazy: true,
  })
  playlists?: Playlist[];

  @ApiProperty({ example: '', description: '' })
  @Column('boolean', { default: false, name: 'is_gospel' })
  isGospel: boolean;

  @ApiProperty({ example: '', description: '' })
  @OneToMany(() => RequestedTrack, (requestedTrack) => requestedTrack.track, {
    nullable: true,
    lazy: true,
  })
  requestedTrack?: RequestedTrack[];

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
