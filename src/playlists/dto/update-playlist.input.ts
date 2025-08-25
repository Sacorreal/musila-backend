import { Field, InputType, PartialType } from '@nestjs/graphql';
import { CreatePlaylistInput } from './create-playlist.input';

@InputType()
export class UpdatePlaylistInput extends PartialType(CreatePlaylistInput) {
  @Field(() => String)
  id: string;
}
