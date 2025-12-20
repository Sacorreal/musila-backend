import { CreateTrackInput } from './create-track.input';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTrackInput extends PartialType(CreateTrackInput) {}
