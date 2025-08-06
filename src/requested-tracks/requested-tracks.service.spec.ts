import { Test, TestingModule } from '@nestjs/testing';
import { RequestedTracksService } from './requested-tracks.service';

describe('RequestedTracksService', () => {
  let service: RequestedTracksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestedTracksService],
    }).compile();

    service = module.get<RequestedTracksService>(RequestedTracksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
