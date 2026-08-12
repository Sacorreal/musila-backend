import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PromotionStatus } from '../entities/promotion-status.enum';
import { PromotionType } from '../entities/promotion-type.enum';

/** Filtros del listado administrativo de pautas. */
export class PromotionAdminQueryDto {
  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;
}

/** Filtro del listado de pautas de un publisher. */
export class PromotionMineQueryDto {
  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}
