import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Mood } from 'src/moods/entities/mood.entity';
import { Theme } from 'src/themes/entities/theme.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExternalId } from './external-id.entity';

@Entity({ name: 'track' })
export class Track {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { nullable: false })
  title: string;

  @ManyToOne(() => MusicalGenre, (musicalGenre) => musicalGenre.tracks, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  genre: MusicalGenre;

  @Column('varchar', { name: 'ritmo', nullable: true })
  ritmo?: string;

  @Column({ type: 'varchar', nullable: true })
  coverUrl?: string;

  @Column('varchar', { nullable: true, name: 'audio_url' })
  audioUrl?: string;

  @Column('int', { nullable: true })
  year?: number;

  @Column('varchar', { name: 'audio_key', default: 'sin-audio-key' })
  audioKey: string;

  @Column('varchar', { nullable: false })
  language: string;

  @Column('varchar', { nullable: true })
  lyric?: string;

  @Column('jsonb', { name: 'externals_ids', nullable: true })
  externalsIds?: ExternalId[]

  @Column('varchar', { nullable: true, name: 'iswc' })
  iswc?: string;

  @OneToMany(() => IntellectualProperty, (it) => it.track, { cascade: true })
  intellectualProperties?: IntellectualProperty[];

  @Column('boolean', { default: true, name: 'is_available' })
  isAvailable: boolean;

  @ManyToMany(() => User, (user) => user.tracks, { nullable: false })
  @JoinTable()
  authors: User[];

  @ManyToMany(() => Playlist, (playlist) => playlist.tracks, {
    nullable: true,
  })
  playlists?: Playlist[];

  @Column('boolean', { default: false, name: 'is_gospel' })
  isGospel: boolean;

  @ManyToMany(() => Mood, (mood) => mood.tracks, { nullable: false })
  @JoinTable({ name: 'track_moods' })
  moods: Mood[];

  @ManyToOne(() => Theme, (theme) => theme.tracks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  theme?: Theme;

  @Column('boolean', { default: false, name: 'is_feat' })
  isFeat: boolean;

  @OneToMany(() => RequestedTrack, (requestedTrack) => requestedTrack.track, {
    nullable: true,
  })
  requestedTrack?: RequestedTrack[];

  @Column('varchar', { nullable: true, name: 'cover_key' })
  coverKey?: string

  @Column('varchar', { nullable: true, name: 'sheet_music_key' })
  sheetMusicKey?: string;

  @Column('varchar', { nullable: true, name: 'sheet_music_url' })
  sheetMusicUrl?: string;

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
