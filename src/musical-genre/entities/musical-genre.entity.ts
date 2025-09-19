
import { ApiProperty } from '@nestjs/swagger';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'musical_genre' })
export class MusicalGenre {

  @ApiProperty({ example: '', description: '' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '', description: '' })
  @Column()
  genre: string;

  @ApiProperty({ example: '', description: '' })
  @Column({ type: 'text', nullable: true, array: true })
  subGenre?: string[];

  @ApiProperty({ example: '', description: '' })
  @OneToMany(() => Track, (track) => track.genre, {
    cascade: true,
    nullable: true,
  })
  tracks: Track[];

  @ApiProperty({ example: '', description: '' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ example: '', description: '' })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ApiProperty({ example: '', description: '' })
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
  })
  deletedAt?: Date;
}
