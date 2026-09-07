import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { LegalIdentificationType } from '../legal-identification-type.enum';

/**
 * Identidad legal del usuario (Ley 527 / Ley 1581): datos que vinculan de
 * forma inequívoca al firmante con su identidad real para dar validez
 * probatoria a splits firmados y reproducciones de terceros. Los campos
 * identificatorios se guardan cifrados (AES-256-GCM, ver
 * `LegalIdentityCipherService`) — nunca se persisten en claro.
 */
@Entity({ name: 'legal_identities' })
export class LegalIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column('text', { name: 'primer_nombre' })
  primerNombreEncrypted: string;

  @Column('text', { name: 'segundo_nombre' })
  segundoNombreEncrypted: string;

  @Column('text', { name: 'primer_apellido' })
  primerApellidoEncrypted: string;

  @Column('text', { name: 'segundo_apellido' })
  segundoApellidoEncrypted: string;

  @Column({ type: 'enum', enum: LegalIdentificationType, name: 'tipo_identificacion' })
  tipoIdentificacion: LegalIdentificationType;

  @Column('text', { name: 'numero_identificacion' })
  numeroIdentificacionEncrypted: string;

  @Column('text', { name: 'fecha_expedicion' })
  fechaExpedicionEncrypted: string;

  @Column('text', { name: 'numero_celular' })
  numeroCelularEncrypted: string;

  @Column('varchar', { length: 8, name: 'indicativo_pais' })
  indicativoPais: string;

  @Column('timestamptz', { name: 'verified_at', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
