//TODO: Agregar como atributos los metadatos que vienen como respuesta del servicio de alojamiento "Digital Ocean Spaces"

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
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

  
  @ManyToOne(() => MusicalGenre, musicalGenre => musicalGenre.tracks, {
    onDelete: 'CASCADE',
    eager: false,
    nullable: false,
  })
  genre: MusicalGenre;

  @Column('varchar', { name: 'sub_genre', nullable: true })
  @Field({ nullable: true })
  subGenre?: string;

  
  @Column({ type: 'varchar', default: 'urllogoapp.img', nullable: true })
  @Field({ nullable: true })
  cover?: string;

  @Column('varchar', { nullable: false })
  @Field()
  url: string; //TODO: En modelo de datos no está como not Null es decir esta como opcional en el modelo de datos

  @Column('int', { nullable: false })
  year: number; //TODO: Está propiedad no está en el modelo de datos

  @Column('varchar', { nullable: false })
  @Field()
  language: string;

  @Column('varchar', { nullable: true })
  @Field(() => String)
  lyric?: string; //TODO: Preguntar porque en modelo de datos esta como not null pero acá esta como opcional

  @Column('simple-json', { name: 'externals_ids', nullable: true }) //TODO: Porque en el Modelo de datos está como(Bjson) y acá está como simple json
  @Field(() => [String])
  externalsIds?: Record<string, string>;

  @Column('varchar', { name: 'split_sheet', nullable: true })
  @Field()
  splitSheet?: string;

  @Column('jsonb', { name: 'certificates_DNDA', nullable: true, array: true })
  @Field(() => [String])
  certificatesDNDA?: Record<string, string>;

  @Column('boolean', { default: true, name: 'is_available' })
  @Field()
  isAvailable: boolean;

  @ManyToMany(() => User, (user) => user.tracks)
  @JoinTable()
  @Field(() => User)
  authors: User[];

  @ManyToMany(() => Playlist, (playlist) => playlist.tracks)
  playlists: Playlist[]


  @Column('boolean', { default: false, name: 'is_gospel' })
  @Field()
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
  @Field()
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  @Field()
  deletedAt?: Date;

  //TODO: Consultar ultimas 3 propiedades ya que en el modelo de datos están de otra forma*/
  //TODO: En el modelo de datos hay una propiedad duration_ms se agrega o no?
}
