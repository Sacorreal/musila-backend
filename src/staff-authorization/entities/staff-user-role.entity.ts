import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffRole } from './staff-role.entity';

/** Un único rol interno activo por miembro del staff (user_id es UNIQUE). */
@Entity({ name: 'staff_user_roles' })
export class StaffUserRole {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => StaffRole, { nullable: false, onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'staff_role_id' })
  staffRole: StaffRole;

  @Column('uuid', { name: 'staff_role_id' })
  staffRoleId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser?: User;

  @Column('uuid', { name: 'assigned_by', nullable: true })
  assignedBy?: string;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
