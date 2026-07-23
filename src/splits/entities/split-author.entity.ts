import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Split } from './split.entity';
import { CoauthorRole } from './coauthor-role.enum';
import { SplitAuthorStatus } from './split-author-status.enum';

@Entity({ name: 'split_author' })
@Unique('UQ_split_user', ['split', 'user'])
export class SplitAuthor {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Split, (split) => split.authors, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  split: Split;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({ example: 50 })
  @Column('numeric', { precision: 5, scale: 2 })
  percentage: number;

  @ApiProperty({ enum: CoauthorRole, example: CoauthorRole.COMPOSITOR })
  @Column({ type: 'enum', enum: CoauthorRole })
  role: CoauthorRole;

  @ApiProperty({ enum: SplitAuthorStatus, example: SplitAuthorStatus.PENDING })
  @Column({
    type: 'enum',
    enum: SplitAuthorStatus,
    default: SplitAuthorStatus.PENDING,
  })
  status: SplitAuthorStatus;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Column('timestamptz', { name: 'signed_at', nullable: true })
  signedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
