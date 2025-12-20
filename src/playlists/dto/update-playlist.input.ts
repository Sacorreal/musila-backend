import { CreatePlaylistInput } from './create-playlist.input';
import { PartialType } from '@nestjs/mapped-types';


export class UpdatePlaylistInput extends PartialType(CreatePlaylistInput) {}
