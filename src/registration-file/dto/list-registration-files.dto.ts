import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { RegistrationFileStatus } from '../entities/registration-file-status.enum';

/**
 * Filtros del listado paginado de expedientes. Paginación basada en `page`
 * (1-indexada) para alinear con el componente `AdminPagination` del frontend.
 */
export class ListRegistrationFilesDto {
  @ApiPropertyOptional({ description: 'Página (1-indexada)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Registros por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Búsqueda parcial por número de expediente, código interno o título' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RegistrationFileStatus, description: 'Filtrar por estado del expediente' })
  @IsOptional()
  @IsEnum(RegistrationFileStatus)
  status?: RegistrationFileStatus;

  @ApiPropertyOptional({ description: 'Filtrar por propietario. Solo lo aplica el rol admin; se ignora para autores.' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
