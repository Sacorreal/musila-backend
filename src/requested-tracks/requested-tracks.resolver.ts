import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RequestedTracksService } from './requested-tracks.service';
import { RequestedTrack } from './entities/requested-track.entity';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';

@Resolver(() => RequestedTrack)
export class RequestedTracksResolver {
  constructor(private readonly requestedTracksService: RequestedTracksService) {}

  @Mutation(() => RequestedTrack)
  createRequestedTrack(@Args('createRequestedTrackInput') createRequestedTrackInput: CreateRequestedTrackInput) {
    return this.requestedTracksService.create(createRequestedTrackInput);
  }

  @Query(() => [RequestedTrack], { name: 'requestedTracks' })
  findAll() {
    return this.requestedTracksService.findAll();
  }

  @Query(() => RequestedTrack, { name: 'requestedTrack' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.requestedTracksService.findOne(id);
  }

  @Mutation(() => RequestedTrack)
  updateRequestedTrack(@Args('updateRequestedTrackInput') updateRequestedTrackInput: UpdateRequestedTrackInput) {
    return this.requestedTracksService.update(updateRequestedTrackInput.id, updateRequestedTrackInput);
  }

  @Mutation(() => RequestedTrack)
  removeRequestedTrack(@Args('id', { type: () => Int }) id: number) {
    return this.requestedTracksService.remove(id);
  }
}
