import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateMusicalGenreInput {

  @IsString()
  @IsNotEmpty()
  @Field()
  genre: string

  @IsArray()
  @IsOptional()
  @Field(() => [String], { nullable: true })
  subGenre?: string[]
}
