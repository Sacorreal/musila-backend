import { CreateRequestedTrackInput } from './create-requested-track.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRequestedTrackInput extends PartialType(CreateRequestedTrackInput) {
  @Field(() => Int)
  id: number;
}
