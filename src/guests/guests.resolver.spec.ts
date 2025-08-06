import { Test, TestingModule } from '@nestjs/testing';
import { GuestsResolver } from './guests.resolver';
import { GuestsService } from './guests.service';

describe('GuestsResolver', () => {
  let resolver: GuestsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuestsResolver, GuestsService],
    }).compile();

    resolver = module.get<GuestsResolver>(GuestsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
