import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Max, Min } from 'class-validator';
import { OrganizationType } from '../../organizations/entities/organization-type.enum';
import { COMMISSION_APPLICABLE_ORGANIZATION_TYPES } from '../commission.constants';

/**
 * Actualización de la comisión de un plan para un tipo de organización (§8).
 * Solo se aceptan los tipos B2B aplicables (§9.3). El `organizationType` del
 * comprador NUNCA se resuelve desde aquí: este payload configura la tarifa, no
 * autoriza una compra.
 */
export class UpdateTransactionFeeDto {
  @ApiProperty({
    enum: COMMISSION_APPLICABLE_ORGANIZATION_TYPES as unknown as OrganizationType[],
    example: OrganizationType.LABEL,
  })
  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @ApiProperty({ example: 7, minimum: 0, maximum: 100, description: 'Porcentaje (0-100), hasta 2 decimales' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate: number;
}
