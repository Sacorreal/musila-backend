import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { Track } from './entities/track.entity';
import { TracksService } from './tracks.service';

@Resolver(() => Track)
export class TracksResolver {
  constructor(private readonly tracksService: TracksService) {}

  @Mutation(() => Track)
  createTrack(@Args('createTrackInput') createTrackInput: CreateTrackInput) {
    return this.tracksService.create(createTrackInput);
  }

  @Query(() => [Track], { name: 'tracks' })
  findAll() {
    return this.tracksService.findAll();
  }

  @Query(() => Track, { name: 'track' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.tracksService.findOne(id);
  }

  @Mutation(() => Track)
  updateTrack(@Args('updateTrackInput') updateTrackInput: UpdateTrackInput) {
    return this.tracksService.update(updateTrackInput.id, updateTrackInput);
  }

  @Mutation(() => Track)
  removeTrack(@Args('id', { type: () => String }) id: string) {
    return this.tracksService.remove(id);
  }
}
