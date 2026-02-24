import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  AfterLoad
} from 'typeorm';

@Entity({ name: 'musical_genre' })
export class MusicalGenre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  genre: string;

  @Column({ type: 'text', nullable: true, array: true })
  subGenre?: string[];

  @Column({ type: 'text', nullable: true })
  slug?: string;

  @OneToMany(() => Track, (track) => track.genre, {
    cascade: true,
    nullable: true,
  })
  tracks: Track[];

  @CreateDateColumn({ name: 'created_at' })
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

  @AfterLoad()
  ensureSubGenreIsArray() {
    if (!this.subGenre) {
      this.subGenre = [];
    }
  }
}
