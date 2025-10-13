
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';


export class CreatePlaylistInput {

  @ApiProperty({
    example: 'Playlist de Verano 2025',
    description: 'Título o nombre de la playlist.'
  })
  @IsString()
  title: string

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único (UUID) del usuario propietario de la playlist.'
  })
  @IsUUID()
  owner: string

  @ApiPropertyOptional({
    example: 'https://ejemplo.com/imagenes/playlist-verano.jpg',
    description: 'URL de la imagen de portada de la playlist (opcional).'
  })
  @IsOptional()
  @IsString()
  cover?: string

  @ApiPropertyOptional({
    example: [
      '111e8400-e29b-41d4-a716-446655440000',
      '222e8400-e29b-41d4-a716-446655440000'
    ],
    description: 'Lista de identificadores únicos (UUID v4) de los invitados a la playlist (opcional).'
  })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  guestIds?: string[]

  @ApiPropertyOptional({
    example: [
      '333e8400-e29b-41d4-a716-446655440000',
      '444e8400-e29b-41d4-a716-446655440000'
    ],
    description: 'Lista de identificadores únicos (UUID v4) de los tracks que forman parte de la playlist (opcional).'
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  trackIds?: string[]

}
