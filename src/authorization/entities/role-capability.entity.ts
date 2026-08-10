import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Capability } from './capability.entity';
import { CapabilityScope } from './capability-scope.enum';
import { Role } from './role.entity';

/** Capability otorgada por un rol, con el scope concreto en que se ejerce. */
@Entity({ name: 'role_capabilities' })
@Unique(['roleId', 'capabilityId'])
export class RoleCapability {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.roleCapabilities, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column('uuid', { name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Capability, { nullable: false, onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'capability_id' })
  capability: Capability;

  @Column('uuid', { name: 'capability_id' })
  capabilityId: string;

  @ApiProperty({ enum: CapabilityScope, example: CapabilityScope.ORGANIZATION })
  @Column('varchar', { length: 20 })
  scope: CapabilityScope;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
