import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMusicalGenreInput {

  @IsString()
  @IsNotEmpty()
  genre: string

  @IsArray()
  @IsOptional()
  subGenre?: string[]
}
