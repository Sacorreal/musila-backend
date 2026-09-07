import { WalletEarningsService } from './wallet-earnings.service';
import { WalletEarningRole } from '../entities/wallet-earning-role.enum';
import { WalletDistributionSource } from '../entities/wallet-distribution-source.enum';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';

describe('WalletEarningsService', () => {
  let service: WalletEarningsService;
  let earningRepo: any;
  let withdrawalRepo: any;
  let licenseContractRepo: any;
  let distributionService: any;

  const owner = { id: 'owner-1' };
  const requestedTrack = {
    id: 'req-1',
    owner,
    track: { id: 'track-1', title: 'Mi Canción' },
    licensePrice: 100000,
  };

  beforeEach(() => {
    earningRepo = { save: jest.fn().mockResolvedValue({}), find: jest.fn().mockResolvedValue([]) };
    withdrawalRepo = { find: jest.fn().mockResolvedValue([]) };
    licenseContractRepo = { findOne: jest.fn().mockResolvedValue(null) };
    distributionService = {
      resolveDistribution: jest.fn().mockResolvedValue({
        requestedTrack,
        entries: [{ userId: 'owner-1', percentage: 100 }],
        source: WalletDistributionSource.EQUAL_FALLBACK,
      }),
    };

    service = new WalletEarningsService(earningRepo, withdrawalRepo, licenseContractRepo, distributionService);
  });

  describe('creditFromLicensePayment', () => {
    it('ignora el pago si el requestedTrack ya tiene un LicenseContract', async () => {
      licenseContractRepo.findOne.mockResolvedValue({ id: 'contract-1' });

      await service.creditFromLicensePayment('req-1');

      expect(distributionService.resolveDistribution).not.toHaveBeenCalled();
      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('acredita el licensePrice repartido según la distribución resuelta', async () => {
      await service.creditFromLicensePayment('req-1');

      expect(earningRepo.save).toHaveBeenCalledTimes(1);
      const saved = earningRepo.save.mock.calls[0][0];
      expect(saved.amount).toBe(100000);
      expect(saved.role).toBe(WalletEarningRole.OWN);
      expect(saved.sourceReference).toBe('license:req-1');
    });

    it('no acredita nada si licensePrice es nulo', async () => {
      distributionService.resolveDistribution.mockResolvedValue({
        requestedTrack: { ...requestedTrack, licensePrice: null },
        entries: [{ userId: 'owner-1', percentage: 100 }],
        source: WalletDistributionSource.EQUAL_FALLBACK,
      });

      await service.creditFromLicensePayment('req-1');

      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('ignora duplicados por constraint UNIQUE (idempotencia)', async () => {
      earningRepo.save.mockRejectedValueOnce({ code: '23505' });

      await expect(service.creditFromLicensePayment('req-1')).resolves.not.toThrow();
      expect(earningRepo.save).toHaveBeenCalledTimes(1);
    });

    it('propaga errores que no son de constraint duplicado', async () => {
      earningRepo.save.mockRejectedValueOnce(new Error('db down'));

      await expect(service.creditFromLicensePayment('req-1')).rejects.toThrow('db down');
    });
  });

  describe('creditFromInstallment', () => {
    it('acredita el monto de la cuota con la referencia de la cuota', async () => {
      await service.creditFromInstallment({
        collectionId: 'coll-1',
        requestedTrackId: 'req-1',
        licenseContractId: 'contract-1',
        amount: 50000,
        paidAt: new Date('2026-01-01'),
      });

      expect(distributionService.resolveDistribution).toHaveBeenCalledWith('req-1', { licenseContractId: 'contract-1' });
      const saved = earningRepo.save.mock.calls[0][0];
      expect(saved.amount).toBe(50000);
      expect(saved.sourceReference).toBe('collection:coll-1');
    });
  });

  describe('comisión de publisher', () => {
    const trackWithSnapshot = (snapshot: any[], entries: any[], licensePrice = 100000) => ({
      requestedTrack: {
        id: 'req-1',
        owner,
        track: { id: 'track-1', title: 'Mi Canción' },
        licensePrice,
        publisherCommissionSnapshot: snapshot,
      },
      entries,
      source: WalletDistributionSource.EQUAL_FALLBACK,
    });

    it('acredita la comisión a la organización y descuenta al vendedor', async () => {
      distributionService.resolveDistribution.mockResolvedValue(
        trackWithSnapshot(
          [{ beneficiaryUserId: 'owner-1', publisherOrganizationId: 'pub-1', percentage: 10 }],
          [{ userId: 'owner-1', percentage: 100 }],
        ),
      );

      await service.creditFromLicensePayment('req-1');

      const saved = earningRepo.save.mock.calls.map((c: any[]) => c[0]);
      expect(saved).toHaveLength(2);

      const seller = saved.find((e) => e.beneficiary?.id === 'owner-1');
      const publisher = saved.find((e) => e.beneficiaryOrganization?.id === 'pub-1');

      expect(seller.amount).toBe(90000);
      expect(seller.role).toBe(WalletEarningRole.OWN);
      expect(publisher.amount).toBe(10000);
      expect(publisher.role).toBe(WalletEarningRole.PUBLISHER_COMMISSION);
      expect(publisher.distributionSource).toBe(WalletDistributionSource.PUBLISHER_COMMISSION);
      expect(publisher.beneficiary).toBeNull();
    });

    it('prorratea la comisión entre todos los vendedores (base = total de la licencia)', async () => {
      distributionService.resolveDistribution.mockResolvedValue(
        trackWithSnapshot(
          [{ beneficiaryUserId: 'owner-1', publisherOrganizationId: 'pub-1', percentage: 10 }],
          [
            { userId: 'owner-1', percentage: 60 },
            { userId: 'co-1', percentage: 40 },
          ],
        ),
      );

      await service.creditFromLicensePayment('req-1');

      const saved = earningRepo.save.mock.calls.map((c: any[]) => c[0]);
      const ownerEarning = saved.find((e) => e.beneficiary?.id === 'owner-1');
      const coauthor = saved.find((e) => e.beneficiary?.id === 'co-1');
      const publisher = saved.find((e) => e.beneficiaryOrganization?.id === 'pub-1');

      expect(ownerEarning.amount).toBe(54000); // 60% de 90000 (neto)
      expect(coauthor.amount).toBe(36000); // 40% de 90000
      expect(publisher.amount).toBe(10000); // 10% de 100000
    });

    it('ignora entradas del snapshot cuyo beneficiario no está en el reparto', async () => {
      distributionService.resolveDistribution.mockResolvedValue(
        trackWithSnapshot(
          [{ beneficiaryUserId: 'ausente', publisherOrganizationId: 'pub-1', percentage: 50 }],
          [{ userId: 'owner-1', percentage: 100 }],
        ),
      );

      await service.creditFromLicensePayment('req-1');

      const saved = earningRepo.save.mock.calls.map((c: any[]) => c[0]);
      expect(saved).toHaveLength(1);
      expect(saved[0].amount).toBe(100000);
    });

    it('topa la comisión total al bruto cuando los porcentajes exceden el 100%', async () => {
      distributionService.resolveDistribution.mockResolvedValue(
        trackWithSnapshot(
          [
            { beneficiaryUserId: 'owner-1', publisherOrganizationId: 'pub-1', percentage: 70 },
            { beneficiaryUserId: 'co-1', publisherOrganizationId: 'pub-2', percentage: 60 },
          ],
          [
            { userId: 'owner-1', percentage: 50 },
            { userId: 'co-1', percentage: 50 },
          ],
        ),
      );

      await service.creditFromLicensePayment('req-1');

      const saved = earningRepo.save.mock.calls.map((c: any[]) => c[0]);
      const publisherTotal = saved
        .filter((e) => e.role === WalletEarningRole.PUBLISHER_COMMISSION)
        .reduce((acc, e) => acc + e.amount, 0);
      expect(publisherTotal).toBeLessThanOrEqual(100000);
    });
  });

  describe('getOrganizationBalance', () => {
    it('suma las comisiones de la organización y descuenta sus retiros', async () => {
      earningRepo.find.mockResolvedValue([
        { role: WalletEarningRole.PUBLISHER_COMMISSION, amount: 15000 },
        { role: WalletEarningRole.PUBLISHER_COMMISSION, amount: 5000 },
      ]);
      withdrawalRepo.find.mockResolvedValue([
        { status: WalletWithdrawalStatus.PAID, amount: 4000 },
        { status: WalletWithdrawalStatus.IN_PROCESS, amount: 1000 },
      ]);

      const balance = await service.getOrganizationBalance('pub-1');

      expect(balance.totalEarned).toBe(20000);
      expect(balance.totalWithdrawnPaid).toBe(4000);
      expect(balance.totalReserved).toBe(1000);
      expect(balance.availableBalance).toBe(15000);
    });
  });

  describe('getBalance', () => {
    it('calcula el saldo disponible descontando retiros pendientes/en proceso/pagados', async () => {
      earningRepo.find.mockResolvedValue([
        { role: WalletEarningRole.OWN, amount: 100000 },
        { role: WalletEarningRole.COAUTHOR, amount: 20000 },
      ]);
      withdrawalRepo.find.mockResolvedValue([
        { status: WalletWithdrawalStatus.PAID, amount: 30000 },
        { status: WalletWithdrawalStatus.PENDING, amount: 10000 },
        { status: WalletWithdrawalStatus.REJECTED, amount: 999999 },
      ]);

      const balance = await service.getBalance('owner-1');

      expect(balance.totalEarnedOwn).toBe(100000);
      expect(balance.totalEarnedCoauthor).toBe(20000);
      expect(balance.totalEarned).toBe(120000);
      expect(balance.totalWithdrawnPaid).toBe(30000);
      expect(balance.totalReserved).toBe(10000);
      expect(balance.availableBalance).toBe(80000);
    });
  });
});
