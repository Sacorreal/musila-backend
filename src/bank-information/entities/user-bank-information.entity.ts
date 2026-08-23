import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { BankInformationMethod } from './bank-information-method.enum';

/**
 * Perfil de cobro de anticipos del usuario (1 fila por usuario, editable a
 * futuro). El payload de la cuenta (Colombia/Wompi o Extranjero/Global66) se
 * cifra en `encryptedPayload` vía `BankAccountCipherService` — nunca se
 * persiste en texto plano.
 */
@Entity({ name: 'user_bank_information' })
export class UserBankInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @Index('IDX_user_bank_information_user', { unique: true })
  user: User;

  @Column({ type: 'enum', enum: BankInformationMethod, name: 'method' })
  method: BankInformationMethod;

  /** Payload cifrado (AES-256-GCM, `iv:authTag:ciphertext`) — JSON con los campos según `method`. */
  @Column({ type: 'text', name: 'encrypted_payload' })
  encryptedPayload: string;

  /** Solo aplica a Global66: momento en que el usuario aceptó los avisos legales. */
  @Column({ type: 'timestamptz', name: 'legal_notice_accepted_at', nullable: true })
  legalNoticeAcceptedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
