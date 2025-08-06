import { Test, TestingModule } from '@nestjs/testing';
import { MusicalGenreService } from './musical-genre.service';

describe('MusicalGenreService', () => {
  let service: MusicalGenreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MusicalGenreService],
    }).compile();

    service = module.get<MusicalGenreService>(MusicalGenreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
