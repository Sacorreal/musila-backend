import { IsUUID } from 'class-validator';
import { CreateRequestedTrackInput } from './create-requested-track.input';
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';

@InputType()
export class UpdateRequestedTrackInput extends PartialType(CreateRequestedTrackInput) {
  @IsUUID()
  @Field(() => ID)
  id: string;
}
