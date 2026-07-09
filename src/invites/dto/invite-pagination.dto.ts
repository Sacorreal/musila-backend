import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class InvitePaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado de uso' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isUsed?: boolean;

  @ApiPropertyOptional({ description: 'Buscar por email invitado' })
  @IsOptional()
  @IsString()
  email?: string;
}
