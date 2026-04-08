import { Playlist } from 'src/playlists/entities/playlist.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity({ name: 'guest' })
export class Guest {

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID único del invitado' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del invitado' })
  @Column('varchar', { length: 255 })
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del invitado' })
  @Column('varchar', { name: 'last_name' })
  lastName: string;

  @ApiProperty({ example: 'juan.perez@email.com', description: 'Correo electrónico único' })
  @Column('varchar', { nullable: false, unique: true })
  email: string;

  @ApiPropertyOptional({ example: '+54', description: 'Código de país' })
  @Column('varchar', { name: 'country_code', nullable: true })
  countryCode: string;

  @ApiPropertyOptional({ example: '2615551234', description: 'Número de teléfono' })
  @Column('varchar', { nullable: true })
  phone: string

  @ApiPropertyOptional({ example: 'DNI', description: 'Tipo de documento de identidad' })
  @Column('varchar', { name: 'type_citizen_id', nullable: true })
  typeCitizenID: string;

  @ApiPropertyOptional({ example: '40123456', description: 'Número de documento' })
  @Column({ name: 'citizen_id', nullable: true })
  citizenID: string;

  @ApiPropertyOptional({ example: 'https://...', description: 'URL del avatar' })
  @Column('varchar', { name: 'avatar', nullable: true })
  avatar?: string;

  @ApiProperty({ example: true, description: 'Estado de verificación' })
  @Column('boolean', { default: true, name: 'is_verified' })
  isVerified: boolean;

  @Column('varchar', { nullable: false, select: false })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.INVITADO, description: 'Rol de sistema' })
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
