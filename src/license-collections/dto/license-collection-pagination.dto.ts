import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { CollectionStatus } from '../entities/collection-status.enum';

export class LicenseCollectionPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CollectionStatus })
  @IsOptional()
  @IsEnum(CollectionStatus)
  status?: CollectionStatus;

  @ApiPropertyOptional({ description: 'Filtrar por solicitud de licencia asociada' })
  @IsOptional()
  @IsUUID()
  requestedTrackId?: string;

  @ApiPropertyOptional({ description: 'Fecha pactada desde (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha pactada hasta (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
}
