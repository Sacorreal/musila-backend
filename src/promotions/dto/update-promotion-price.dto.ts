import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';
import { PromotionType } from '../entities/promotion-type.enum';

/** Actualización (versionada) del precio de un tipo de pauta por el superadmin. */
export class UpdatePromotionPriceDto {
  @ApiProperty({ enum: PromotionType, example: PromotionType.TRACK })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({ example: 50000, minimum: 0, description: 'Precio en COP, hasta 2 decimales' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;
}
