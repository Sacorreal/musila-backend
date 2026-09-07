import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WebauthnChallengeType } from './webauthn-challenge-type.enum';

/**
 * Challenge WebAuthn temporal (§10, §11, §20). Se guarda en servidor para
 * garantizar que sea de un solo uso (`consumedAt`) y con expiración
 * (`expiresAt`), evitando ataques de replay. En el login con passkeys
 * "discoverable" el `userId` es desconocido hasta verificar, por eso es
 * nullable.
 */
@Entity({ name: 'webauthn_challenges' })
@Index(['challenge', 'type'])
export class WebauthnChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Valor del challenge en base64url tal como lo emite la librería. */
  @Column('varchar', { name: 'challenge' })
  challenge: string;

  @Column('varchar', { name: 'type', length: 20 })
  type: WebauthnChallengeType;

  @Column('uuid', { name: 'user_id', nullable: true })
  userId?: string;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt: Date;

  @Column('timestamptz', { name: 'consumed_at', nullable: true })
  consumedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
