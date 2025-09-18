import { IsUUID } from 'class-validator';
import { CreateRequestedTrackInput } from './create-requested-track.input';
import { PartialType } from '@nestjs/mapped-types';


export class UpdateRequestedTrackInput extends PartialType(CreateRequestedTrackInput) {
  @IsUUID()
  id: string;
}
