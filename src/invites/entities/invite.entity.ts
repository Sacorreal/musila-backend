import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity({ name: 'invite' })
export class Invite {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Token único para la invitación' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  token: string;

  @ApiPropertyOptional({ description: 'Email del destinatario (opcional)' })
  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @ApiProperty({ description: 'Indica si el token ya fue utilizado', default: false })
  @Column({ type: 'boolean', default: false, name: 'is_used' })
  isUsed: boolean;

  @ApiProperty({ description: 'Fecha y hora de expiración del token (24h)' })
  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  invitedBy: User;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
