import { Playlist } from 'src/playlists/entities/playlist.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'guest' })
export class Guest {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.INVITADO })
  role: UserRole;

  @ManyToOne(() => User, (user) => user.guests, { nullable: false })
  invited_by: User;

  @ManyToMany(() => Playlist, (playlist) => playlist.guests, { nullable: true })
  playlists?: Playlist[];
}
