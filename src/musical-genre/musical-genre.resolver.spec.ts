import { Test, TestingModule } from '@nestjs/testing';
import { MusicalGenreResolver } from './musical-genre.resolver';
import { MusicalGenreService } from './musical-genre.service';

describe('MusicalGenreResolver', () => {
  let resolver: MusicalGenreResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MusicalGenreResolver, MusicalGenreService],
    }).compile();

    resolver = module.get<MusicalGenreResolver>(MusicalGenreResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
