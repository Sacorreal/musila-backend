import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CapabilityScope } from '../entities/capability-scope.enum';

export class SetRoleCapabilitiesDto {
  @ApiProperty({ type: [String], description: 'Set completo de IDs de capabilities del rol' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  capabilityIds: string[];

  @ApiPropertyOptional({ enum: CapabilityScope })
  @IsOptional()
  @IsEnum(CapabilityScope)
  scope?: CapabilityScope;
}
