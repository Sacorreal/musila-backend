import { Guest } from 'src/guests/entities/guest.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CollaboratorPermission } from './collaborator-permission.enum';

@Entity({ name: 'playlist_collaborator' })
@Unique('UQ_playlist_guest', ['playlist', 'guest'])
export class PlaylistCollaborator {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Playlist, { nullable: false, onDelete: 'CASCADE' })
  playlist: Playlist;

  @ManyToOne(() => Guest, { nullable: false, onDelete: 'CASCADE' })
  guest: Guest;

  @ApiProperty({ enum: CollaboratorPermission, example: CollaboratorPermission.READ })
  @Column({
    type: 'enum',
    enum: CollaboratorPermission,
    default: CollaboratorPermission.READ,
  })
  permission: CollaboratorPermission;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
