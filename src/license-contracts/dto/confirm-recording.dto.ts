import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmRecordingDto {
  @ApiProperty({ example: 'US-ABC-27-00001', description: 'ISRC asignado a la grabación' })
  @IsString({ message: 'El ISRC debe ser un texto válido' })
  @IsNotEmpty({ message: 'El ISRC es obligatorio' })
  @MaxLength(15, { message: 'El ISRC no puede superar 15 caracteres' })
  isrc: string;
}
