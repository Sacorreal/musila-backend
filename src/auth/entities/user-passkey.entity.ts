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
 * Credencial WebAuthn (Passkey) registrada por un usuario (§5). Musila
 * almacena únicamente la clave pública y los metadatos necesarios para
 * verificar futuras firmas: la clave privada nunca abandona el autenticador
 * del dispositivo, y jamás se persiste biometría, Face ID, Touch ID ni PIN.
 *
 * La revocación es lógica (`revokedAt`) para conservar trazabilidad (§14).
 */
@Entity({ name: 'user_passkeys' })
export class UserPasskey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column('uuid', { name: 'user_id' })
  userId: string;

  /** ID de credencial WebAuthn (base64url). Único global (§5, §20). */
  @Column('varchar', { name: 'credential_id', unique: true })
  credentialId: string;

  /** Clave pública COSE en base64url. Nunca la privada. */
  @Column('text', { name: 'public_key' })
  publicKey: string;

  /**
   * Contador de firmas reportado por el autenticador. Se guarda como bigint
   * (algunos autenticadores usan valores altos) y se mapea a number.
   */
  @Column('bigint', {
    name: 'sign_count',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? 0 : Number(value)),
    },
  })
  signCount: number;

  @Column('varchar', { name: 'aaguid', nullable: true })
  aaguid?: string;

  /** 'singleDevice' | 'multiDevice' (según la librería). */
  @Column('varchar', { name: 'device_type', nullable: true })
  deviceType?: string;

  /** Si la credencial multi-dispositivo está respaldada (synced). */
  @Column('boolean', { name: 'backed_up', default: false })
  backedUp: boolean;

  /** Transportes soportados (usb, nfc, ble, internal, hybrid). */
  @Column('jsonb', { name: 'transports', nullable: true })
  transports?: string[];

  /** Nombre legible elegido por el usuario (ej. "MacBook de trabajo"). */
  @Column('varchar', { name: 'name', length: 100, nullable: true })
  name?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column('timestamptz', { name: 'last_used_at', nullable: true })
  lastUsedAt?: Date;

  /** Marca de revocación lógica. `!= null` significa revocada (§14). */
  @Column('timestamptz', { name: 'revoked_at', nullable: true })
  revokedAt?: Date;
}
