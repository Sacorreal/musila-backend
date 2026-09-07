import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from '../../shared/dto/pagination.dto';

export class ListCollectiveManagementSocietyDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'CO', description: 'Filtra por código ISO de país (alpha-2)' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'SAYCO', description: 'Búsqueda libre por acrónimo o nombre oficial' })
  @IsOptional()
  @IsString()
  search?: string;
}
