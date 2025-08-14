import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class MusicalGenre {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
