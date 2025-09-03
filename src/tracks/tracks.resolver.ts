import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { GqlAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { Track } from './entities/track.entity';
import { TracksService } from './tracks.service';

@Resolver(() => Track)
export class TracksResolver {
  constructor(private readonly tracksService: TracksService) {}

  @Mutation(() => Track)
  createTrackResolver(
    @Args('createTrackInput') createTrackInput: CreateTrackInput,
  ) {
    return this.tracksService.createTrackService(createTrackInput);
  }

  @Query(() => [Track], { name: 'tracks', description: 'listado de tracks' })
  @UseGuards(GqlAuthGuard)
  findAllTracksResolver(@CurrentUser([UserRole.ADMIN]) user: JwtPayload) {
    return this.tracksService.findAllTracksService();
  }

  @Query(() => Track, { name: 'track' })
  findOneTrackResolver(@Args('id', { type: () => String }) id: string) {
    return this.tracksService.findOneTrackService(id);
  }

  @Mutation(() => Track)
  updateTrackResolver(
    @Args('updateTrackInput') updateTrackInput: UpdateTrackInput,
  ) {
    return this.tracksService.updateTrackService(
      updateTrackInput.id,
      updateTrackInput,
    );
  }

  @Mutation(() => Track)
  removeTrackResolver(@Args('id', { type: () => String }) id: string) {
    return this.tracksService.removeTrackService(id);
  }
}
