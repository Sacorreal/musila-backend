//TODO: Agregar como atributos los metadatos que vienen como respuesta del servicio de alojamiento "Digital Ocean Spaces"

import { Field, ID, ObjectType } from '@nestjs/graphql';
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

@ObjectType()
@Entity({ name: 'track' })
export class Track {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column('varchar', { nullable: false })
  @Field()
  title: string;

  @ManyToOne(() => MusicalGenre, (musicalGenre) => musicalGenre.tracks, {
    onDelete: 'CASCADE',
    eager: false,
    nullable: false,
  })
  @Field(() => MusicalGenre)
  genre: MusicalGenre;

  @Column('varchar', { name: 'sub_genre', nullable: true })
  @Field({ nullable: true })
  subGenre?: string;

  //TODO: agregar url del logo de la app por default
  @Column({ type: 'varchar', default: 'urllogoapp.img', nullable: false })
  @Field({ nullable: true })
  cover?: string;

  @Column('varchar', { nullable: false })
  @Field()
  url: string;

  /*@Column('int', { nullable: false })
  @Field()
  year: number;*/

  @Column('varchar', { nullable: false })
  @Field()
  language: string;

  @Column('varchar', { nullable: false })
  @Field(() => String)
  lyric: string;

  @Column('jsonb', { name: 'externals_ids', nullable: true })
  @Field(() => [String], { nullable: true })
  externalsIds?: Record<string, string>;

  @OneToMany(() => IntellectualProperty, (it) => it.track)
  @Field(() => [IntellectualProperty])
  intellectualProperties: IntellectualProperty[];

  @Column('boolean', { default: true, name: 'is_available' })
  @Field()
  isAvailable: boolean;

  @ManyToMany(() => User, (user) => user.tracks, { nullable: false })
  @JoinTable()
  @Field(() => User)
  authors: User[];

  @ManyToMany(() => Playlist, (playlist) => playlist.tracks, {
    nullable: true,
    lazy: true,
  })
  @Field(() => Playlist, { nullable: true })
  playlists?: Playlist[];

  @Column('boolean', { default: false, name: 'is_gospel' })
  @Field()
  isGospel: boolean;

  @OneToMany(() => RequestedTrack, (requestedTrack) => requestedTrack.track, {
    nullable: true,
    lazy: true,
  })
  @Field(() => [RequestedTrack], {
    description: 'Listado de solicitudes de uso que ha recibido la cancion',
    nullable: true,
  })
  requestedTrack?: RequestedTrack[];

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
