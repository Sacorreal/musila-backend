import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsISO31661Alpha2, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { SocietyAffiliationRightsType } from '../entities/society-affiliation-rights-type.enum';
import { SocietyAffiliationTerritoryMode } from '../entities/society-affiliation-territory-mode.enum';

export class CreateSocietyAffiliationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID de la sociedad en el catálogo maestro' })
  @IsUUID()
  collectiveManagementSocietyId: string;

  @ApiProperty({ enum: SocietyAffiliationRightsType })
  @IsEnum(SocietyAffiliationRightsType)
  rightsType: SocietyAffiliationRightsType;

  @ApiProperty({ enum: SocietyAffiliationTerritoryMode })
  @IsEnum(SocietyAffiliationTerritoryMode)
  territoryMode: SocietyAffiliationTerritoryMode;

  @ApiPropertyOptional({
    type: [String],
    example: ['CO'],
    description:
      'Países ISO 3166-1 alpha-2. Incluidos si territoryMode=SPECIFIC_COUNTRIES, excluidos si WORLDWIDE_EXCEPT; se ignora si WORLDWIDE. Requerido (no vacío) salvo en WORLDWIDE.',
  })
  @IsOptional()
  @IsArray()
  @IsISO31661Alpha2({ each: true })
  territoryCountries?: string[];

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  membershipNumber?: string;

  @ApiProperty({ example: '12345678901', description: 'IPI Name Number: 11 dígitos numéricos (CISAC)' })
  @Matches(/^\d{11}$/, { message: 'ipiNameNumber debe tener 11 dígitos numéricos (CISAC IPI Name Number)' })
  ipiNameNumber: string;

  @ApiPropertyOptional({ example: '123456789', description: 'IPI Base Number: 9 dígitos numéricos (CISAC)' })
  @IsOptional()
  @Matches(/^\d{9}$/, { message: 'ipiBaseNumber debe tener 9 dígitos numéricos (CISAC IPI Base Number)' })
  ipiBaseNumber?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;
}
