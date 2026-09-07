import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SubjectType } from './subject-type.enum';

/**
 * Contador de consumo de un entitlement por sujeto y período. El unique
 * compuesto soporta el upsert atómico de `UsageService.consume()` (§8:
 * incremento atómico sin race conditions).
 */
@Entity({ name: 'usage' })
@Unique(['subjectType', 'subjectId', 'entitlementKey', 'periodKey'])
export class Usage {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: SubjectType, example: SubjectType.USER })
  @Column('varchar', { name: 'subject_type', length: 20 })
  subjectType: SubjectType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column('uuid', { name: 'subject_id' })
  subjectId: string;

  @ApiProperty({ example: 'tracks.publish' })
  @Column('varchar', { name: 'entitlement_key', length: 120 })
  entitlementKey: string;

  /** 'lifetime', 'YYYY-MM', 'YYYY', 'YYYY-MM-DD' o 'sub:<id>:<inicio>'. */
  @ApiProperty({ example: 'lifetime' })
  @Column('varchar', { name: 'period_key', length: 80 })
  periodKey: string;

  @ApiProperty({ example: 3 })
  @Column('int', { default: 0 })
  consumed: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
