import { Guest } from 'src/guests/entities/guest.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Nota de un usuario "Descubridor" sobre un track, opcionalmente anclada a un
 * segundo de la reproducción. El autor es un `User` o un `Guest` (login
 * unificado: el mismo `JwtPayload.id` puede ser cualquiera de los dos), por
 * eso se modela como dos FKs nullable en vez de un campo tipo+id, igual que
 * el beneficiario polimórfico de `WalletEarning`.
 *
 * Visibilidad: sin `playlist` la nota es privada (solo su autor); con
 * `playlist` es visible para todos los miembros de esa playlist. Esa regla
 * vive en `TrackNotesService`, no en la entidad.
 */
@Entity({ name: 'track_note' })
@Index(['track', 'playlist'])
export class TrackNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Track, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @ManyToOne(() => Playlist, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'playlist_id' })
  playlist: Playlist | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_user_id' })
  authorUser: User | null;

  @ManyToOne(() => Guest, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_guest_id' })
  authorGuest: Guest | null;

  @Column('text')
  content: string;

  @Column('int', { nullable: true, name: 'timestamp_seconds' })
  timestampSeconds: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
