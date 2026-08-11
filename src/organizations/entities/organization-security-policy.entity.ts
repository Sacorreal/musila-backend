import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * Política de seguridad configurable por organización (§4). La evaluación es
 * siempre tenant-aware: una misma persona puede estar sujeta a políticas
 * distintas según el `Membership` con el que actúe. Esta política nunca
 * modifica la configuración global del usuario; solo condiciona el acceso al
 * workspace protegido de esta organización.
 */
@Entity({ name: 'organization_security_policies' })
export class OrganizationSecurityPolicy {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column('uuid', { name: 'organization_id', unique: true })
  organizationId: string;

  /** Si es true, los miembros deben tener MFA para acceder al workspace. */
  @ApiProperty({ example: true })
  @Column('boolean', { name: 'mfa_required', default: false })
  mfaRequired: boolean;

  /** Si es true, la MFA debe cumplirse específicamente con una Passkey. */
  @ApiProperty({ example: true })
  @Column('boolean', { name: 'passkey_required', default: false })
  passkeyRequired: boolean;

  /** Si es true, se permite TOTP como método MFA alternativo/fallback. */
  @ApiProperty({ example: true })
  @Column('boolean', { name: 'totp_allowed', default: true })
  totpAllowed: boolean;

  /** Si es true, el onboarding exige generar Recovery Codes. */
  @ApiProperty({ example: true })
  @Column('boolean', { name: 'recovery_codes_required', default: false })
  recoveryCodesRequired: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
