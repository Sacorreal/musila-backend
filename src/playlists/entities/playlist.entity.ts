import { Guest } from 'src/guests/entities/guest.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'playlist' })
export class Playlist {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @ManyToOne(() => User, (user) => user.playlists)
  @JoinColumn()
  @ManyToOne(() => User, user => user.playlists, {
    onDelete: 'CASCADE' // Borra el playlists al borrar el user
  })
  owner: User

  @Column({ type: 'varchar', nullable: true })
  cover?: string

  @ManyToMany(() => Guest, guest => guest.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_guests' })
  guests?: Guest[]

  @ManyToMany(() => Track, track => track.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_tracks' })
  tracks?: Track[]

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })

  @UpdateDateColumn({
    name: 'update_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date

  @DeleteDateColumn({
    name: 'delete_at',
    type: 'timestamp',
    nullable: true
  })
  deletedAt?: Date
}
