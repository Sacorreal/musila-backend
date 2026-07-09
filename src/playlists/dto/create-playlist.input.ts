
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';


export class CreatePlaylistInput {

  @ApiProperty({
    example: 'Playlist de Verano 2025',
    description: 'Título o nombre de la playlist.'
  })
  @IsString()
  title: string

  @ApiPropertyOptional({
    description: 'ID del usuario propietario de la playlist. Solo tiene efecto si quien crea es ADMIN; de lo contrario se usa el usuario autenticado.',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string
}
