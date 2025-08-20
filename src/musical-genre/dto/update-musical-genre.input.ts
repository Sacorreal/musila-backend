import { IsUUID } from 'class-validator';
import { CreateMusicalGenreInput } from './create-musical-genre.input';
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';

@InputType()
export class UpdateMusicalGenreInput extends PartialType(CreateMusicalGenreInput) {
  
  @IsUUID()
  @Field(() => ID)
  id: string;
}
