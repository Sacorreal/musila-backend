import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { AccessRequestStatus } from '../entities/access-request-status.enum';

/** Filtros del listado de solicitudes de acceso. */
export class AccessRequestQueryDto {
  @ApiPropertyOptional({ enum: AccessRequestStatus, description: 'Filtra por estado de la solicitud' })
  @IsOptional()
  @IsEnum(AccessRequestStatus)
  status?: AccessRequestStatus;
}
