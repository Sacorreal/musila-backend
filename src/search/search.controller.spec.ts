import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: { searchService: jest.Mock };

  beforeEach(async () => {
    searchService = { searchService: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: searchService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates the query DTO to SearchService.searchService', async () => {
    const dto = { q: 'rock', limit: 20, offset: 0 };
    const expected = {
      tracks: [],
      musicalGenres: [],
      authors: [],
      meta: {
        limit: 20,
        tracksTotal: 0,
        genresTotal: 0,
        authorsTotal: 0,
        hasMoreTracks: false,
        hasMoreAuthors: false,
        hasMoreGenres: false,
      },
    };
    searchService.searchService.mockResolvedValue(expected);

    const result = await controller.searchController(dto);

    expect(searchService.searchService).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });
});
