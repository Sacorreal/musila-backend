import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

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
  @JoinColumn()
  @ManyToOne(() => User, user => user.playlists, {
    onDelete: 'CASCADE' // Borra el playlists al borrar el user
  })
  owner: User

  @Column({ type: 'varchar', nullable: true })
  @Field({ nullable: true })
  cover?: string

  @Field(() => [Guest], {
    nullable: true,
    description: 'usuarios invitados para hacer CRUD a la lista de reproducción '
  })
  @ManyToMany(() => Guest, guest => guest.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_guests' })
  guests?: Guest[]

  @Field(() => [Track], { nullable: true })
  @ManyToMany(() => Track, track => track.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_tracks' })
  tracks?: Track[]

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  @Field()
  createdAt: Date

  @UpdateDateColumn({
    name: 'update_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  @Field()
  updatedAt: Date

  @DeleteDateColumn({
    name: 'delete_at',
    type: 'timestamp',
    nullable: true
  })
  @Field({ nullable: true })
  deletedAt?: Date
}
