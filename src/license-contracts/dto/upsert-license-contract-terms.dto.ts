import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { LicenseTerritoryMode } from '../entities/license-territory-mode.enum';
import { LicenseDistributionFormat } from '../entities/license-distribution-format.enum';
import { LicenseInstallmentInputDto } from './license-installment-input.dto';
import { LicenseAdvanceDistributionInputDto } from './license-advance-distribution-input.dto';

export class UpsertLicenseContractTermsDto {
  @ApiProperty({
    example: '2027-01-15T00:00:00.000Z',
    description: 'Plazo para que el intérprete asigne el ISRC de la grabación',
  })
  @IsDateString()
  validityDate: string;

  @ApiProperty({ enum: LicenseTerritoryMode })
  @IsEnum(LicenseTerritoryMode, { message: 'El territorio no es válido' })
  territoryMode: LicenseTerritoryMode;

  @ApiProperty({ type: [String], required: false, description: 'Códigos ISO-3166 alpha-2, solo si territoryMode = specific_countries' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  territoryCountries?: string[];

  @ApiProperty({ example: 500000, description: 'Anticipo en COP que recibe el licenciante (sin comisión)' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El anticipo debe ser un número válido' })
  @Min(0, { message: 'El anticipo no puede ser negativo' })
  advanceAmount: number;

  @ApiProperty({ example: 1, description: 'Número de cuotas en las que se pagará el anticipo' })
  @IsInt()
  @Min(1)
  advanceInstallmentsCount: number;

  @ApiProperty({
    type: [LicenseInstallmentInputDto],
    required: false,
    description: 'Detalle de cada cuota (monto + fecha), requerido si advanceAmount > 0',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicenseInstallmentInputDto)
  installments?: LicenseInstallmentInputDto[];

  @ApiProperty({ example: 15, description: 'Porcentaje de regalía sobre el master (0 a 100)' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La regalía debe ser un número válido' })
  @Min(0)
  @Max(100, { message: 'La regalía no puede superar 100' })
  royaltyPercentage: number;

  @ApiProperty({ enum: LicenseDistributionFormat, isArray: true })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un formato de distribución' })
  @IsEnum(LicenseDistributionFormat, { each: true, message: 'Formato de distribución no válido' })
  distributionFormats: LicenseDistributionFormat[];

  @ApiProperty({
    type: [LicenseAdvanceDistributionInputDto],
    required: false,
    description: 'Reparto del anticipo por coautor, requerido si advanceAmount > 0 y el track tiene coautores',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicenseAdvanceDistributionInputDto)
  advanceDistribution?: LicenseAdvanceDistributionInputDto[];
}
