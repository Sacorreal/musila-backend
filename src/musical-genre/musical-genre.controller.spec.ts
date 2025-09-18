import { Test, TestingModule } from '@nestjs/testing';
import { MusicalGenreController } from './musical-genre.controller';
import { MusicalGenreService } from './musical-genre.service';

describe('MusicalGenreResolver', () => {
  let controller: MusicalGenreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MusicalGenreController, MusicalGenreService],
    }).compile();

    controller = module.get<MusicalGenreController>(MusicalGenreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
