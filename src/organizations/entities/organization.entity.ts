import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { BusinessDocumentType } from '../constants/business-document-catalog';
import { OrganizationStatus } from './organization-status.enum';
import { OrganizationType } from './organization-type.enum';
import { Tenant } from './tenant.entity';
import { UserBankAccount } from 'src/users/entities/user.entity';

/**
 * Cliente B2B (label, publisher, etc.). El tipo determina el universo de
 * capabilities que la organización puede utilizar (§20 del requerimiento),
 * pero no concede autorización por sí mismo.
 */
@Entity({ name: 'organizations' })
export class Organization {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Tenant, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid', { name: 'tenant_id', unique: true })
  tenantId: string;

  @ApiProperty({ example: 'Sony Music' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.LABEL })
  @Index()
  @Column('varchar', { length: 30 })
  type: OrganizationType;

  @ApiProperty({ example: 'sony-music' })
  @Column('varchar', { length: 100, unique: true })
  slug: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  /**
   * IPI de la editorial (CISAC), a nivel de organización: una publisher tiene
   * un único número IPI compartido por todo su roster, no uno por autor. Usado
   * por el Editorial Command Center para validar el Split Editorial.
   */
  @ApiProperty({ example: '00000000199', required: false })
  @Column('varchar', { name: 'ipi_number', length: 50, nullable: true })
  ipiNumber?: string;

  /**
   * Cuenta bancaria de la organización a la que se giran los retiros de su
   * wallet (ej. comisiones de publisher). Reutiliza la misma forma que la
   * cuenta bancaria de usuario; solo se persiste, nunca datos sensibles extra.
   */
  @Column('jsonb', { name: 'bank_account', nullable: true })
  bankAccount?: UserBankAccount;

  /**
   * Ciclo de vida de onboarding comercial B2B (§Registro Legal B2B). Las
   * organizaciones creadas antes de este flujo (alta manual del admin de
   * Musila) nacen/quedan en VERIFICADA vía backfill de migración.
   */
  @ApiProperty({ enum: OrganizationStatus, example: OrganizationStatus.VERIFICADA })
  @Index()
  @Column({ type: 'varchar', length: 20, default: OrganizationStatus.VERIFICADA })
  status: OrganizationStatus;

  /** País de constitución de la empresa (ISO 3166-1 alpha-2). */
  @ApiPropertyOptional({ example: 'CO' })
  @Column('varchar', { name: 'legal_country', length: 2, nullable: true })
  legalCountry?: string;

  /** Tipo de documento tributario de la empresa, controlado por país (ver `business-document-catalog`). */
  @ApiPropertyOptional({ enum: BusinessDocumentType, example: BusinessDocumentType.NIT })
  @Column({ type: 'varchar', length: 30, name: 'document_type', nullable: true })
  documentType?: BusinessDocumentType;

  /** Número de documento completo, incluyendo dígito de verificación (ej. NIT 901091582-2). */
  @ApiPropertyOptional({ example: '901091582-2' })
  @Column('varchar', { name: 'document_number', length: 50, nullable: true })
  documentNumber?: string;

  @ApiPropertyOptional({ example: '+57' })
  @Column('varchar', { name: 'phone_country_code', length: 8, nullable: true })
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @Column('varchar', { name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string;

  /** Usuario que envió el formulario de registro público (futuro Organization Admin). */
  @Column('uuid', { name: 'registered_by_user_id', nullable: true })
  registeredByUserId?: string | null;

  /**
   * Plan comercial elegido en `createBusinessForm` (referencia a
   * `entitlements.Plan`). Se actualiza si la organización sube de plan.
   * Independiente de `entitlements.Subscription.planId`, que solo existe
   * una vez la organización queda VERIFICADA y arranca su facturación.
   */
  @Column('uuid', { name: 'plan_id', nullable: true })
  planId?: string | null;

  @ApiPropertyOptional({ example: 'El nombre legal no coincide con el documento aportado' })
  @Column('varchar', { name: 'rejection_reason', length: 500, nullable: true })
  rejectionReason?: string | null;

  /** Fecha en que se cumplieron todos los requisitos de verificación (inicio de la suscripción). */
  @Column('timestamptz', { name: 'verified_at', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
