import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { CapabilitySubject } from '../entities/capability-subject.enum';

export class CapabilityCatalogQueryDto {
  @ApiPropertyOptional({ example: 'ROSTER' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ enum: CapabilitySubject })
  @IsOptional()
  @IsEnum(CapabilitySubject)
  assignableTo?: CapabilitySubject;

  @ApiPropertyOptional({ enum: OrganizationType })
  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
