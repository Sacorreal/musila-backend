import { Playlist } from 'src/playlists/entities/playlist.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'guest' })
export class Guest {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { name: 'last_name' })
  lastName: string;

  @Column('varchar', { nullable: false, unique: true })
  email: string;

  @Column('varchar', { name: 'country_code', nullable: true })
  countryCode: string;

  @Column('varchar', { nullable: true })
  phone: string

  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  typeCitizenID: string;

  @Column({ name: 'citizen_id', nullable: true })
  citizenID: string;

  @Column('varchar', { name: 'avatar', nullable: true })
  avatar?: string;

  @Column('boolean', { default: true, name: 'is_verified' })
  isVerified: boolean;

  @Column('varchar', { nullable: false, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.INVITADO })
  role: UserRole;

  @ManyToOne(() => User, (user) => user.guests, { nullable: false })
  invited_by: User;

  @ManyToMany(() => Playlist, (playlist) => playlist.guests, { nullable: true })
  playlists?: Playlist[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
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
