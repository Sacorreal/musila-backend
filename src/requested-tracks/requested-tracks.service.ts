import { Injectable } from '@nestjs/common';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';

@Injectable()
export class RequestedTracksService {
  create(createRequestedTrackInput: CreateRequestedTrackInput) {
    return 'This action adds a new requestedTrack';
  }

  findAll() {
    return `This action returns all requestedTracks`;
  }

  findOne(id: string) {
    return `This action returns a #${id} requestedTrack`;
  }

  update(id: string, updateRequestedTrackInput: UpdateRequestedTrackInput) {
    return `This action updates a #${id} requestedTrack`;
  }

  remove(id: string) {
    return `This action removes a #${id} requestedTrack`;
  }
}
