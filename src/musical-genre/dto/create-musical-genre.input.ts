import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMusicalGenreInput {

  @ApiProperty({ example: '', description: '' })
  @IsString()
  @IsNotEmpty()
  genre: string

  @ApiProperty({ example: '', description: '' })
  @IsArray()
  @IsOptional()
  subGenre?: string[]
}
