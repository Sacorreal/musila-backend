import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateRequestedTrackInput } from './create-requested-track.input';

@InputType()
export class UpdateRequestedTrackInput extends PartialType(
  CreateRequestedTrackInput,
) {
  @Field(() => String)
  id: string;
}
