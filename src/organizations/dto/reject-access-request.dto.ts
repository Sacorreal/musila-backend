import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Rechazo de una solicitud de acceso, con un motivo opcional. */
export class RejectAccessRequestDto {
  @ApiPropertyOptional({ example: 'No reconocemos a esta persona', description: 'Motivo del rechazo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
