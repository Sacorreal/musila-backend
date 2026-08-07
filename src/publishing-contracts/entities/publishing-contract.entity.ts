import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublishingContractStatus } from './publishing-contract-status.enum';

/**
 * Contrato editorial registrado por el usuario, independiente de cualquier
 * track: un mismo contrato puede cubrir muchas obras (referenciado desde
 * `RegistrationFile.publishingContract`), evitando resubir el mismo PDF en
 * cada expediente.
 */
@Entity({ name: 'publishing_contract' })
export class PublishingContract {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ApiProperty({ example: 'Editorial Musical S.A.S' })
  @Column({ type: 'varchar', name: 'publisher_name' })
  publisherName: string;

  @ApiProperty({ example: '2026-01-01' })
  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @ApiProperty({ example: '2030-01-01', required: false })
  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: string | null;

  @ApiProperty({ example: 'publishing-contracts/uuid.pdf' })
  @Column({ type: 'varchar', name: 'document_key' })
  documentKey: string;

  @ApiProperty({ example: 'https://cdn.musila.com/...' })
  @Column({ type: 'text', name: 'document_url' })
  documentUrl: string;

  @ApiProperty({ enum: PublishingContractStatus, example: PublishingContractStatus.VIGENTE })
  @Column({
    type: 'enum',
    enum: PublishingContractStatus,
    enumName: 'publishing_contract_status_enum',
    default: PublishingContractStatus.VIGENTE,
  })
  status: PublishingContractStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  /** Estado real, recalculado contra `endDate` sin depender de un cron que actualice la columna. */
  get effectiveStatus(): PublishingContractStatus {
    if (this.endDate && new Date(this.endDate).getTime() < Date.now()) {
      return PublishingContractStatus.FINALIZADO;
    }
    return this.status;
  }
}
