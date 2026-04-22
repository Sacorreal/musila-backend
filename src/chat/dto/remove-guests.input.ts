import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class RemoveGuestsInput {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  guestIds: string[];
}
