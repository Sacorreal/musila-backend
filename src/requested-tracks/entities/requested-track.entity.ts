import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class RequestedTrack {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
