import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffPermission } from './staff-permission.entity';

@Entity({ name: 'staff_roles' })
export class StaffRole {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Editor' })
  @Column('varchar', { length: 100, unique: true })
  name: string;

  @ApiProperty({ example: 'editor' })
  @Column('varchar', { length: 100, unique: true })
  slug: string;

  @ApiProperty({ example: 'Gestiona blog y contenido musical', required: false })
  @Column('text', { nullable: true })
  description?: string;

  /** Roles base (Super Admin, Admin, Editor, Soporte): no editables ni eliminables. */
  @ApiProperty({ example: false })
  @Column('boolean', { name: 'is_system', default: false })
  isSystem: boolean;

  @Column('uuid', { name: 'created_by', nullable: true })
  createdBy?: string;

  @ManyToMany(() => StaffPermission, { cascade: false })
  @JoinTable({
    name: 'staff_role_permissions',
    joinColumn: { name: 'staff_role_id' },
    inverseJoinColumn: { name: 'staff_permission_id' },
  })
  permissions: StaffPermission[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
