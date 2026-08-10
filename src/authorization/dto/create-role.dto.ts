import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CapabilityScope } from '../entities/capability-scope.enum';
import { RoleType } from '../entities/role-type.enum';

const CUSTOM_ROLE_TYPES = [RoleType.ORGANIZATION, RoleType.ROSTER] as const;

export class CreateRoleDto {
  @ApiProperty({ example: 'A&R Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Gestiona el roster y las campañas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CUSTOM_ROLE_TYPES, example: RoleType.ORGANIZATION })
  @IsIn(CUSTOM_ROLE_TYPES)
  type: (typeof CUSTOM_ROLE_TYPES)[number];

  @ApiProperty({ type: [String], description: 'IDs de capabilities del catálogo global' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  capabilityIds: string[];

  @ApiPropertyOptional({ enum: CapabilityScope, description: 'Scope de las capabilities del rol' })
  @IsOptional()
  @IsEnum(CapabilityScope)
  scope?: CapabilityScope;
}
