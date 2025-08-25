import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'playlist' })
@ObjectType()
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ type: 'varchar' })
  @Field()
  title: string;

  @ManyToOne(() => User, (user) => user.playlists)
  @Field(() => User)
  owner: User;

  @Column({ type: 'varchar', nullable: true })
  @Field(() => String, { nullable: true })
  cover?: string;

  @ManyToMany(() => Guest, (guest) => guest.playlists, { nullable: true })
  @JoinColumn()
  @Field(() => [Guest], {
    nullable: true,
    description:
      'usuarios invitados para hacer CRUD a la lista de reproducción',
  })
  guests?: Guest[];

  @ManyToMany(() => Track, (track) => track.playlists, { nullable: true })
  @Field(() => [Track], { nullable: true })
  tracks?: Track[];

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
