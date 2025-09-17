import { IsUUID } from 'class-validator';
import { CreateMusicalGenreInput } from './create-musical-genre.input';
import { PartialType } from '@nestjs/mapped-types';


export class UpdateMusicalGenreInput extends PartialType(CreateMusicalGenreInput) {

  @IsUUID()
  id: string;
}
