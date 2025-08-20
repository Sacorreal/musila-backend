import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { MusicalGenreService } from './musical-genre.service';
import { MusicalGenre } from './entities/musical-genre.entity';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';

@Resolver(() => MusicalGenre)
export class MusicalGenreResolver {
  constructor(private readonly musicalGenreService: MusicalGenreService) { }

  @Mutation(() => MusicalGenre)
  createMusicalGenreResolver(@Args('createMusicalGenreInput') createMusicalGenreInput: CreateMusicalGenreInput) {
    return this.musicalGenreService.createMusicalGenreService(createMusicalGenreInput);
  }

  @Query(() => [MusicalGenre], { name: 'musicalGenres' })
  findAllMusicalGenreResolver() {
    return this.musicalGenreService.findAllMusicalGenreService();
  }

  @Query(() => MusicalGenre, { name: 'musicalGenre' })
  findOneMusicalGenreResolver(@Args('id', { type: () => ID }) id: string) {
    return this.musicalGenreService.findOneMusicalGenreService(id);
  }

  @Mutation(() => MusicalGenre)
  updateMusicalGenreResolver(@Args('updateMusicalGenreInput') updateMusicalGenreInput: UpdateMusicalGenreInput) {
    return this.musicalGenreService.updateMusicalGenreService(updateMusicalGenreInput.id, updateMusicalGenreInput);
  }

  @Mutation(() => Boolean)
  removeMusicalGenreResolver(@Args('id', { type: () => ID }) id: string) {
    return this.musicalGenreService.removeMusicalGenreService(id);
  }
}
