import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'playlist' })
@ObjectType()
export class Playlist {

  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string

  @Column({ type: 'varchar' })
  @Field()
  title: string

  @Field(() => User)
  @ManyToOne(() => User, user => user.playlists)
  owner: User

  @Column({ type: 'varchar' })
  @Field()
  cover?: string

  guests: Guest
  tracks: Track

  @CreateDateColumn()
  @Field()
  createdAt: Date

  @UpdateDateColumn()
  @Field()
  updatedAt: Date

  @DeleteDateColumn()
  @Field()
  deletedAt: Date
}


