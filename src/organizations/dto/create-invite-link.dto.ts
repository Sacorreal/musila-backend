import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Opciones al generar/regenerar el enlace de invitación del workspace. */
export class CreateInviteLinkDto {
  @ApiPropertyOptional({
    example: 30,
    description: 'Días de vigencia del enlace. Envía null para un enlace sin expiración. Por defecto 30.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number | null;

  @ApiPropertyOptional({
    example: 50,
    description: 'Máximo de registros permitidos con el enlace. Omitir para uso ilimitado.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;
}
