import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Track } from './track.entity';

/**
 * Evento append-only de una reproducción efectiva de un track. Alimenta las
 * métricas de "reproducciones totales" y "usuarios únicos" del dashboard del
 * autor. El `user` es nullable para tolerar reproducciones anónimas o de
 * usuarios eliminados; los usuarios únicos se cuentan sobre `user_id` no nulo.
 */
@Entity({ name: 'track_play' })
@Index('IDX_track_play_track_user', ['track', 'user'])
export class TrackPlay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Track, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  @Index('IDX_track_play_track')
  track: Track;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  @Index('IDX_track_play_user')
  user: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  @Index('IDX_track_play_created_at')
  createdAt: Date;
}
