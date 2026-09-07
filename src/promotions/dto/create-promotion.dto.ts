import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { PromotionType } from '../entities/promotion-type.enum';

/** Solicitud para pautar (destacar) un track o el perfil de un compositor. */
export class CreatePromotionDto {
  @ApiProperty({ enum: PromotionType, example: PromotionType.TRACK })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({ description: 'UUID del track o del usuario-compositor a destacar' })
  @IsUUID()
  targetId: string;
}
