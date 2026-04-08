import { RequestedTrack} from '../entities/requested-track.entity'
import { PartialType } from '@nestjs/swagger';


export class UpdateRequestedTrackInput extends PartialType(RequestedTrack) {}
