import { CreateMusicalGenreInput } from './create-musical-genre.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateMusicalGenreInput extends PartialType(CreateMusicalGenreInput) {
  @Field(() => Int)
  id: number;
}
