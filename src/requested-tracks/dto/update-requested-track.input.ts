import { RequestedTrack} from '../entities/requested-track.entity'
import { PartialType } from '@nestjs/mapped-types';


export class UpdateRequestedTrackInput extends PartialType(RequestedTrack) {}
