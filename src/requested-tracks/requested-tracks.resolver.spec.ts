import { Test, TestingModule } from '@nestjs/testing';
import { RequestedTracksResolver } from './requested-tracks.resolver';
import { RequestedTracksService } from './requested-tracks.service';

describe('RequestedTracksResolver', () => {
  let resolver: RequestedTracksResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestedTracksResolver, RequestedTracksService],
    }).compile();

    resolver = module.get<RequestedTracksResolver>(RequestedTracksResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
