import { CreateGuestInput } from './create-guest.input';
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';

@InputType()
export class UpdateGuestInput extends PartialType(CreateGuestInput) {
  @Field(() => ID)
  id: string;
}
