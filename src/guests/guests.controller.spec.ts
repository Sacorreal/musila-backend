import { Test, TestingModule } from '@nestjs/testing';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

describe('GuestsController', () => {
  let controller: GuestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuestsController, GuestsService],
    }).compile();

    controller = module.get<GuestsController>(GuestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
