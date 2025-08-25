import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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
  @JoinColumn()
  @ManyToOne(() => User, user => user.playlists, {
    onDelete: 'CASCADE' // Borra el playlists al borrar el user
  })
  owner: User

  @Column({ type: 'varchar', nullable: true })
  @Field({ nullable: true })
  cover?: string

  @Field(() => [Guest], { nullable: true })
  @ManyToMany(() => Guest, guest => guest.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_guests' })
  guests?: Guest[]

  @Field(() => [Track], { nullable: true })
  @ManyToMany(() => Track, track => track.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_tracks' })
  tracks?: Track[]

  @CreateDateColumn()
  @Field()
  createdAt: Date

  @UpdateDateColumn()
  @Field()
  updatedAt: Date

  @DeleteDateColumn({ nullable: true })
  @Field({ nullable: true })
  deletedAt?: Date
}


