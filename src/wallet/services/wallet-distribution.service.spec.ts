import { NotFoundException } from '@nestjs/common';
import { WalletDistributionService } from './wallet-distribution.service';
import { WalletDistributionSource } from '../entities/wallet-distribution-source.enum';
import { SplitStatus } from 'src/splits/entities/split-status.enum';

describe('WalletDistributionService', () => {
  let service: WalletDistributionService;
  let requestedTrackRepo: any;
  let licenseContractRepo: any;
  let splitRepo: any;

  const owner = { id: 'owner-1' };
  const author1 = { id: 'author-1' };
  const author2 = { id: 'author-2' };
  const requestedTrack = {
    id: 'req-1',
    owner,
    track: { id: 'track-1', authors: [author1, author2] },
  };

  beforeEach(() => {
    requestedTrackRepo = { findOne: jest.fn().mockResolvedValue(requestedTrack) };
    licenseContractRepo = { findOne: jest.fn().mockResolvedValue(null) };
    splitRepo = { findOne: jest.fn().mockResolvedValue(null) };

    service = new WalletDistributionService(requestedTrackRepo, licenseContractRepo, splitRepo);
  });

  it('lanza NotFoundException si el requestedTrack no existe', async () => {
    requestedTrackRepo.findOne.mockResolvedValue(null);
    await expect(service.resolveDistribution('missing')).rejects.toThrow(NotFoundException);
  });

  it('usa advanceDistribution del contrato cuando está presente y suma ~100', async () => {
    licenseContractRepo.findOne.mockResolvedValue({
      advanceDistribution: [
        { userId: 'author-1', percentage: 70 },
        { userId: 'author-2', percentage: 30 },
      ],
    });

    const result = await service.resolveDistribution('req-1', { licenseContractId: 'contract-1' });

    expect(result.source).toBe(WalletDistributionSource.CONTRACT_ADVANCE_DISTRIBUTION);
    expect(result.entries).toEqual([
      { userId: 'author-1', percentage: 70 },
      { userId: 'author-2', percentage: 30 },
    ]);
  });

  it('cae a split si el advanceDistribution del contrato no suma 100', async () => {
    licenseContractRepo.findOne.mockResolvedValue({
      advanceDistribution: [{ userId: 'author-1', percentage: 60 }],
    });
    splitRepo.findOne.mockResolvedValue({
      status: SplitStatus.COMPLETED,
      authors: [{ user: { id: 'author-1' }, percentage: 100 }],
    });

    const result = await service.resolveDistribution('req-1', { licenseContractId: 'contract-1' });

    expect(result.source).toBe(WalletDistributionSource.SPLIT);
  });

  it('usa el split completado del track cuando no hay contrato', async () => {
    splitRepo.findOne.mockResolvedValue({
      status: SplitStatus.COMPLETED,
      authors: [
        { user: { id: 'author-1' }, percentage: 40 },
        { user: { id: 'author-2' }, percentage: 60 },
      ],
    });

    const result = await service.resolveDistribution('req-1');

    expect(result.source).toBe(WalletDistributionSource.SPLIT);
    expect(result.entries).toEqual([
      { userId: 'author-1', percentage: 40 },
      { userId: 'author-2', percentage: 60 },
    ]);
  });

  it('excluye a la publisher coautora del reparto y renormaliza a los humanos a 100', async () => {
    splitRepo.findOne.mockResolvedValue({
      status: SplitStatus.COMPLETED,
      authors: [
        { user: { id: 'author-1' }, organization: null, percentage: 40 },
        { user: { id: 'author-2' }, organization: null, percentage: 40 },
        { user: null, organization: { id: 'pub-1' }, percentage: 20 },
      ],
    });

    const result = await service.resolveDistribution('req-1');

    expect(result.source).toBe(WalletDistributionSource.SPLIT);
    expect(result.entries).toEqual([
      { userId: 'author-1', percentage: 50 },
      { userId: 'author-2', percentage: 50 },
    ]);
  });

  it('cae al reparto igualitario entre autores del track si no hay contrato ni split', async () => {
    const result = await service.resolveDistribution('req-1');

    expect(result.source).toBe(WalletDistributionSource.EQUAL_FALLBACK);
    expect(result.entries).toHaveLength(2);
    const total = result.entries.reduce((acc, e) => acc + e.percentage, 0);
    expect(total).toBe(100);
  });

  it('acredita el 100% al owner si el track no tiene autores', async () => {
    requestedTrackRepo.findOne.mockResolvedValue({
      id: 'req-2',
      owner,
      track: { id: 'track-2', authors: [] },
    });

    const result = await service.resolveDistribution('req-2');

    expect(result.source).toBe(WalletDistributionSource.EQUAL_FALLBACK);
    expect(result.entries).toEqual([{ userId: owner.id, percentage: 100 }]);
  });
});
