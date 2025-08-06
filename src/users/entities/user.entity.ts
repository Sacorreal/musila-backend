import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToMany,
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
  @Field(() => String)
  name: string;

  @Column('varchar', { name: 'last_name' })
  @Field(() => String)
  lastName: string;

  @Column('varchar', { nullable: false, unique: true })
  @Field(() => String)
  email: string;

  @Column('varchar', { nullable: false, select: false })
  @Field(() => String)
  password: string;

  @Column('varchar', { name: 'country_code', nullable: true })
  @Field(() => String)
  countryCode?: string;

  @Column('int', { nullable: true })
  @Field(() => Int)
  phone?: number;

  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  @Field(() => String)
  typeCitizenID?: string;

  @Column('int', { name: 'citizen_id', nullable: true })
  @Field(() => Int)
  citizenID?: number;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  @Field(() => String)
  role: UserRole;

  @Column('varchar', { name: 'avatar', nullable: true })
  @Field(() => String)
  avatar: string;

  @Column('boolean', { default: false, name: 'is_verified' })
  @Field(() => Boolean)
  isVerified: boolean;

  @Column('text', { nullable: true })
  @Field(() => String)
  biography?: string;

  @Column('jsonb', { name: 'social_networks', nullable: true })
  @Field(() => [String])
  socialNetworks?: Record<string, string>;

  @ManyToMany(() => Track, (track) => track.authors)
  @Field(() => Track)
  tracks: Track[];

  //TODO: crear la relacion con entidad Playlist
  /*@OneToMany(() => Playlist, (playlist) => playlist.owner)
  playlists: Playlist[];*/

  //TODO: crear relación con la entidad Guests.
  //Guests

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
  @Field(() => String)
  deletedAt: Date;
}
