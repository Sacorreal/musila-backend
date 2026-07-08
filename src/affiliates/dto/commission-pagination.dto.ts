import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { AffiliateCommissionStatus } from '../entities/affiliate-commission-status.enum';

export class CommissionPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AffiliateCommissionStatus })
  @IsOptional()
  @IsEnum(AffiliateCommissionStatus)
  status?: AffiliateCommissionStatus;

  @ApiPropertyOptional({ description: 'Filtrar por afiliado (solo admin)' })
  @IsOptional()
  @IsUUID()
  affiliateId?: string;
}
