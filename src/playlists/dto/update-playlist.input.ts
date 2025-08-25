import { IsUUID } from 'class-validator';
import { CreatePlaylistInput } from './create-playlist.input';
import { InputType, Field, PartialType, ID } from '@nestjs/graphql';

@InputType()
export class UpdatePlaylistInput extends PartialType(CreatePlaylistInput) {
  @IsUUID()
  @Field(() => ID)
  id: string;
}
