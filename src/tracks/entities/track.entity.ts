//TODO: Agregar como atributos los metadatos que vienen como respuesta del servicio de alojamiento "Digital Ocean Spaces"

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType()
@Entity({ name: 'tracks' })
export class Track {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column('varchar', { nullable: false })
  @Field(() => String)
  title: string;

  //TODO: crear relacion con entidad MusicalGenre
  /*@ManyToOne(() => MusicalGenre, {
    onDelete: 'CASCADE',
    eager: false,
    nullable: false,
  })
  genre: MusicalGenre;*/

  @Column('varchar', { name: 'sub_genre', nullable: true })
  @Field(() => String)
  subGenre?: string;

  //TODO: por default asignar el url del logo de la app
  @Column({ type: 'varchar', default: 'urllogoapp.img' })
  @Field(() => String)
  cover: string;

  @Column('varchar', { nullable: false })
  @Field(() => String)
  url: string;

  @Column('int', { nullable: false })
  year: number;

  @Column('varchar', { nullable: false })
  @Field(() => String)
  language: string;

  @Column('varchar', { nullable: true })
  @Field(() => String)
  lyric?: string;

  @Column('simple-json', { name: 'externals_ids', nullable: true })
  @Field(() => [String])
  externalsIds?: Record<string, string>;

  @Column('varchar', { name: 'split_sheet', nullable: true })
  @Field(() => String)
  splitSheet?: string;

  @Column('jsonb', { name: 'certificates_DNDA', nullable: true })
  @Field(() => [String])
  certificatesDNDA?: Record<string, string>;

  @Column('boolean', { default: true, name: 'is_available' })
  @Field(() => Boolean)
  isAvailable: boolean;

  @ManyToMany(() => User, (user) => user.tracks)
  @JoinTable()
  @Field(() => User)
  authors: User[];

  //TODO:crear relacion con entidad Playlist
  /*@ManyToMany(() => Playlist, (playlist) => playlist.tracks)
  playlists: Playlist[];*/

  @Column('boolean', { default: false, name: 'is_gospel' })
  @Field(() => Boolean)
  isGospel: boolean;

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
  @Field(() => String)
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  @Field(() => String)
  deletedAt?: Date;
}
