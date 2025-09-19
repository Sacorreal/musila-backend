import { ApiProperty } from '@nestjs/swagger';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'guest' })
export class Guest {

  @ApiProperty({ example: '', description: '' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '', description: '' })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.INVITADO })
  role: UserRole;

  @ApiProperty({ example: '', description: '' })
  @ManyToOne(() => User, (user) => user.guests, { nullable: false })
  invited_by: User;

  @ApiProperty({ example: '', description: '' })
  @ManyToMany(() => Playlist, (playlist) => playlist.guests, { nullable: true })
  playlists?: Playlist[];
}
