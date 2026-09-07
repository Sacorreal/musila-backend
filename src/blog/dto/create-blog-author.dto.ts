import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBlogAuthorDto {
  @ApiProperty({ example: 'Jesse Sumrak', description: 'Nombre del autor.' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del autor es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Sr. Content Marketing Manager', description: 'Rol o cargo del autor.' })
  @IsString()
  @IsNotEmpty({ message: 'El rol del autor es obligatorio' })
  role: string;

  @ApiProperty({ example: 'Escribo sobre música y tecnología.', description: 'Biografía corta del autor.' })
  @IsString()
  @IsNotEmpty({ message: 'La biografía del autor es obligatoria' })
  @MaxLength(500, { message: 'La biografía no debe superar los 500 caracteres' })
  bio: string;

  @ApiPropertyOptional({ description: 'URL pública de la foto de perfil (obtenida tras subir a storage).' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Key del objeto en storage de la foto de perfil.' })
  @IsOptional()
  @IsString()
  avatarKey?: string;

  @ApiPropertyOptional({ description: 'Slug del perfil público (auto-generado a partir del nombre si se omite).' })
  @IsOptional()
  @IsString()
  slug?: string;
}
