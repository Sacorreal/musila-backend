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

  findOne(id: number) {
    return `This action returns a #${id} requestedTrack`;
  }

  update(id: number, updateRequestedTrackInput: UpdateRequestedTrackInput) {
    return `This action updates a #${id} requestedTrack`;
  }

  remove(id: number) {
    return `This action removes a #${id} requestedTrack`;
  }
}
