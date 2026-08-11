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
import { MfaMethod } from './mfa-method.enum';

/**
 * Autorización temporal emitida tras superar un step-up (§15). Habilita una
 * operación sensible (`scope`) durante una ventana corta (`expiresAt`). Puede
 * ser de un solo uso (`consumedAt`) para operaciones críticas. No concede
 * permisos: solo demuestra una re-autenticación reciente y fuerte.
 */
@Entity({ name: 'step_up_grants' })
@Index(['userId', 'scope'])
export class StepUpGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  /** Ámbito de la operación autorizada (ej. 'account.change_password'). */
  @Column('varchar', { name: 'scope', length: 120 })
  scope: string;

  @Column('varchar', { name: 'method', length: 20 })
  method: MfaMethod;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt: Date;

  @Column('timestamptz', { name: 'consumed_at', nullable: true })
  consumedAt?: Date;
}
