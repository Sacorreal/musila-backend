import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class AccessLogPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por accesos autorizados/no autorizados' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  granted?: boolean;
}
