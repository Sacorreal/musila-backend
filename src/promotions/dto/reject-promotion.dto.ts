import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Rechazo de una pauta por el administrador, con motivo obligatorio. */
export class RejectPromotionDto {
  @ApiProperty({ example: 'La portada no cumple los lineamientos editoriales.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
