import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

export class GuestFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Búsqueda por nombre, apellido o email' })
  @IsOptional()
  @IsString()
  search?: string;
}
