import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';

/** Configuración administrable de una capability; la key nunca cambia (§22). */
export class UpdateCapabilityConfigDto {
  @ApiPropertyOptional({ example: 'Consultar analítica avanzada' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: OrganizationType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(OrganizationType, { each: true })
  organizationTypes?: OrganizationType[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
