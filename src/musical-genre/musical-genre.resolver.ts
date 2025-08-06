import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { MusicalGenreService } from './musical-genre.service';
import { MusicalGenre } from './entities/musical-genre.entity';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';

@Resolver(() => MusicalGenre)
export class MusicalGenreResolver {
  constructor(private readonly musicalGenreService: MusicalGenreService) {}

  @Mutation(() => MusicalGenre)
  createMusicalGenre(@Args('createMusicalGenreInput') createMusicalGenreInput: CreateMusicalGenreInput) {
    return this.musicalGenreService.create(createMusicalGenreInput);
  }

  @Query(() => [MusicalGenre], { name: 'musicalGenre' })
  findAll() {
    return this.musicalGenreService.findAll();
  }

  @Query(() => MusicalGenre, { name: 'musicalGenre' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.musicalGenreService.findOne(id);
  }

  @Mutation(() => MusicalGenre)
  updateMusicalGenre(@Args('updateMusicalGenreInput') updateMusicalGenreInput: UpdateMusicalGenreInput) {
    return this.musicalGenreService.update(updateMusicalGenreInput.id, updateMusicalGenreInput);
  }

  @Mutation(() => MusicalGenre)
  removeMusicalGenre(@Args('id', { type: () => Int }) id: number) {
    return this.musicalGenreService.remove(id);
  }
}
