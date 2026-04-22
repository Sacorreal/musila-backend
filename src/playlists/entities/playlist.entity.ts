import { PlaylistCollaborator } from 'src/playlist-collaborators/entities/playlist-collaborator.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'playlist' })
export class Playlist {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @ManyToOne(() => User, user => user.playlists, {
    onDelete: 'CASCADE' // Borra el playlists al borrar el user
  })
  @JoinColumn()
  owner: User

  @Column({ type: 'varchar', nullable: true })
  cover?: string

  @OneToMany(() => PlaylistCollaborator, collaborator => collaborator.playlist, { cascade: true })
  collaborators?: PlaylistCollaborator[]

  @ManyToMany(() => Track, track => track.playlists, { cascade: true })
  @JoinTable({ name: 'playlist_tracks' })
  tracks?: Track[]

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  createdAt: Date

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true
  })
  deletedAt?: Date
}
