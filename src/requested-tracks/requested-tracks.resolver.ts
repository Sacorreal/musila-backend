import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { RequestedTrack } from './entities/requested-track.entity';
import { RequestedTracksService } from './requested-tracks.service';

@Resolver(() => RequestedTrack)
export class RequestedTracksResolver {
  constructor(
    private readonly requestedTracksService: RequestedTracksService,
  ) {}

  @Mutation(() => RequestedTrack, {
    description: 'Crear solicitud del uso de una cancion',
  })
  createRequestedTrack(
    @Args('createRequestedTrackInput')
    createRequestedTrackInput: CreateRequestedTrackInput,
  ) {
    return this.requestedTracksService.create(createRequestedTrackInput);
  }

  @Query(() => [RequestedTrack], { name: 'requestedTracks' })
  findAll() {
    return this.requestedTracksService.findAll();
  }

  @Query(() => RequestedTrack, { name: 'requestedTrack' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.requestedTracksService.findOne(id);
  }

  @Mutation(() => RequestedTrack)
  updateRequestedTrack(
    @Args('updateRequestedTrackInput')
    updateRequestedTrackInput: UpdateRequestedTrackInput,
  ) {
    return this.requestedTracksService.update(
      updateRequestedTrackInput.id,
      updateRequestedTrackInput,
    );
  }

  @Mutation(() => RequestedTrack)
  removeRequestedTrack(@Args('id', { type: () => String }) id: string) {
    return this.requestedTracksService.remove(id);
  }
}
