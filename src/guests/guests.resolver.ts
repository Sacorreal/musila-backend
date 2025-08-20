import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { GuestsService } from './guests.service';
import { Guest } from './entities/guest.entity';
import { CreateGuestInput } from './dto/create-guest.input';
import { UpdateGuestInput } from './dto/update-guest.input';

@Resolver(() => Guest)
export class GuestsResolver {
  constructor(private readonly guestsService: GuestsService) {}

  @Mutation(() => Guest)
  createGuestResolver(@Args('createGuestInput') createGuestInput: CreateGuestInput) {
    return this.guestsService.createGuestsService(createGuestInput);
  }

  @Query(() => [Guest], { name: 'guests' })
  findAllGuestsResolver() {
    return this.guestsService.findAllGuestsService();
  }

  @Query(() => Guest, { name: 'guest' })
  findOneGuestResolver(@Args('id', { type: () => ID }) id: string) {
    return this.guestsService.findOneGuestsService(id);
  }

  @Mutation(() => Guest)
  updateGuestResolver(@Args('updateGuestInput') updateGuestInput: UpdateGuestInput) {
    return this.guestsService.updateGuestsService(updateGuestInput.id, updateGuestInput);
  }

  @Mutation(() => Boolean)
  removeGuestResolver(@Args('id', { type: () => ID }) id: string) {
    return this.guestsService.removeGuestsService(id);
  }
}
