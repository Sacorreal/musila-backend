import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMusicalGenreInput {

  @ApiProperty({
    example: 'Rock',
    description: 'Nombre del género musical principal.'
  })
  @IsString()
  @IsNotEmpty()
  genre: string

  @ApiProperty({
    example: ['Hard Rock', 'Rock Alternativo', 'Indie Rock'],
    description: 'Lista de subgéneros asociados al género principal. Este campo es opcional.'
  })
  @IsArray()
  @IsOptional()
  subGenre?: string[]
}
