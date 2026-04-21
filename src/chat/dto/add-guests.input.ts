import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class AddGuestsInput {
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('4', { each: true })
    guestIds: string[];
}