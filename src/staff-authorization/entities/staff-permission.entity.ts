import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'staff_permissions' })
export class StaffPermission {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'blog:articles:publish' })
  @Column('varchar', { length: 120, unique: true })
  code: string;

  @ApiProperty({ example: 'blog' })
  @Index()
  @Column('varchar', { length: 50 })
  module: string;

  @ApiProperty({ example: 'Publicar artículos del blog' })
  @Column('varchar', { length: 255 })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
