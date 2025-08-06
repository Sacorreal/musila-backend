import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistsResolver } from './playlists.resolver';
import { PlaylistsService } from './playlists.service';

describe('PlaylistsResolver', () => {
  let resolver: PlaylistsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlaylistsResolver, PlaylistsService],
    }).compile();

    resolver = module.get<PlaylistsResolver>(PlaylistsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
