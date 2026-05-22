import { CreateMusicalGenreInput } from './create-musical-genre.input';
import { PartialType } from '@nestjs/swagger';


export class UpdateMusicalGenreInput extends PartialType(CreateMusicalGenreInput) {}
