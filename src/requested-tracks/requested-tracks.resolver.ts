import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { RequestedTracksService } from './requested-tracks.service';
import { RequestedTrack } from './entities/requested-track.entity';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';

@Resolver(() => RequestedTrack)
export class RequestedTracksResolver {
  constructor(private readonly requestedTracksService: RequestedTracksService) {}

  @Mutation(() => RequestedTrack)
  createRequestedTrackResolver(@Args('createRequestedTrackInput') createRequestedTrackInput: CreateRequestedTrackInput) {
    return this.requestedTracksService.createRequestedTracksService(createRequestedTrackInput);
  }

  @Query(() => [RequestedTrack], { name: 'requestedTracks' })
  findAllRequestedTrackResolver() {
    return this.requestedTracksService.findAllRequestedTracksService();
  }

  @Query(() => RequestedTrack, { name: 'requestedTrack' })
  findOneRequestedTrackResolver(@Args('id', { type: () => ID }) id: string) {
    return this.requestedTracksService.findOneRequestedTracksService(id);
  }

  @Mutation(() => RequestedTrack)
  updateRequestedTrackResolver(@Args('updateRequestedTrackInput') updateRequestedTrackInput: UpdateRequestedTrackInput) {
    return this.requestedTracksService.updateRequestedTracksService(updateRequestedTrackInput.id, updateRequestedTrackInput);
  }

  @Mutation(() => RequestedTrack)
  removeRequestedTrackResolver(@Args('id', { type: () => ID }) id: string) {
    return this.requestedTracksService.removeRequestedTracksService(id);
  }
}
