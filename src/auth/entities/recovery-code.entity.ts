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

/**
 * Código de recuperación de un solo uso (§6). Solo se persiste el hash: el
 * texto plano se muestra una única vez al generarse y nunca vuelve a
 * mostrarse. La regeneración invalida (elimina) los códigos anteriores.
 */
@Entity({ name: 'recovery_codes' })
@Index(['userId', 'usedAt'])
export class RecoveryCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  /** Hash bcrypt del código. Nunca el código en claro. */
  @Column('varchar', { name: 'code_hash' })
  codeHash: string;

  /** `!= null` significa consumido (un solo uso). */
  @Column('timestamptz', { name: 'used_at', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
