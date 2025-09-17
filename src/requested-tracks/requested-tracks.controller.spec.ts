import { Test, TestingModule } from '@nestjs/testing';
import { RequestedTracksController } from './requested-tracks.controller';
import { RequestedTracksService } from './requested-tracks.service';

describe('RequestedTracksResolver', () => {
  let controller: RequestedTracksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestedTracksController, RequestedTracksService],
    }).compile();

    controller = module.get<RequestedTracksController>(RequestedTracksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
