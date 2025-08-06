import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Guest {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
