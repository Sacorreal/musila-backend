import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationAdminDto {
  @ApiProperty({ description: 'ID del usuario destinatario' })
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ example: 'Anuncio del sistema' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Se actualizaron los términos de servicio.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'system', default: 'system' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '/music/settings' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Metadata adicional en formato libre' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
