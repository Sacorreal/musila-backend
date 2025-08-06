import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateRequestedTrackInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
