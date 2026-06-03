import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentSourceStatus {
  AVAILABLE = 'available',
  PENDING = 'pending',
  ERROR = 'error',
}

/**
 * Fuente de pago tokenizada para cobros recurrentes.
 *
 * PCI DSS: esta entidad NUNCA almacena el número completo de tarjeta (PAN) ni el
 * CVV. Solo guarda el identificador opaco de Wompi (`wompiPaymentSourceId`) y
 * datos no sensibles para mostrar al usuario (marca y últimos 4 dígitos).
 */
@Index(['userId'])
@Entity({ name: 'payment_sources' })
export class PaymentSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user?: User;

  @Column('varchar', { name: 'user_id' })
  userId: string;

  @Column('varchar', { name: 'wompi_payment_source_id' })
  wompiPaymentSourceId: string;

  @Column('varchar', { nullable: true })
  brand?: string;

  @Column('varchar', { name: 'last4', length: 4, nullable: true })
  last4?: string;

  @Column({
    type: 'enum',
    enum: PaymentSourceStatus,
    default: PaymentSourceStatus.PENDING,
  })
  status: PaymentSourceStatus;

  @Column('boolean', { name: 'acceptance_token_accepted', default: false })
  acceptanceTokenAccepted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
