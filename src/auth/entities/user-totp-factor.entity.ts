import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Segundo factor TOTP (§7). El secreto se almacena cifrado (AES-256-GCM) y
 * nunca en claro. Un usuario tiene como máximo un factor TOTP activo, de ahí
 * la unicidad de `userId`. `confirmedAt` distingue un setup a medio confirmar
 * de un factor ya verificado y operativo.
 */
@Entity({ name: 'user_totp_factors' })
export class UserTotpFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { name: 'user_id', unique: true })
  userId: string;

  /** Secreto TOTP cifrado (AES-256-GCM, formato iv:tag:ciphertext en base64). */
  @Column('text', { name: 'secret_encrypted' })
  secretEncrypted: string;

  /** `!= null` cuando el usuario ya confirmó el factor con un código válido. */
  @Column('timestamptz', { name: 'confirmed_at', nullable: true })
  confirmedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
