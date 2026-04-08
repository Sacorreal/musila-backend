import { CreateTrackInput } from './create-track.input';
import { PartialType } from '@nestjs/swagger';

export class UpdateTrackInput extends PartialType(CreateTrackInput) {}
