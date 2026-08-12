import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WalletWithdrawalsService } from './wallet-withdrawals.service';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';

describe('WalletWithdrawalsService', () => {
  let service: WalletWithdrawalsService;
  let withdrawalRepo: any;
  let userRepo: any;
  let organizationRepo: any;
  let earningsService: any;
  let eventBus: { emit: jest.Mock };

  const completeBankAccount = {
    bankName: 'Bancolombia',
    accountType: 'Ahorros',
    accountNumber: '123',
    accountHolderName: 'Sofía Pérez',
    accountHolderIdType: 'CC',
    accountHolderIdNumber: '999',
  };

  const user = {
    id: 'user-1',
    name: 'Sofía',
    lastName: 'Pérez',
    email: 'sofia@musila.com',
    bankAccount: completeBankAccount,
  };

  beforeEach(() => {
    withdrawalRepo = {
      save: jest.fn((data) => Promise.resolve({ id: 'wd-1', createdAt: new Date(), ...data })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn(),
    };
    userRepo = { findOne: jest.fn().mockResolvedValue(user) };
    organizationRepo = { findOne: jest.fn() };
    earningsService = {
      getBalance: jest.fn().mockResolvedValue({ availableBalance: 100000, currency: 'COP' }),
      getOrganizationBalance: jest.fn().mockResolvedValue({ availableBalance: 100000, currency: 'COP' }),
    };
    eventBus = { emit: jest.fn() };

    service = new WalletWithdrawalsService(
      withdrawalRepo,
      userRepo,
      organizationRepo,
      earningsService,
      eventBus as any,
    );
  });

  describe('create', () => {
    it('rechaza si el usuario no tiene datos bancarios completos', async () => {
      userRepo.findOne.mockResolvedValue({ ...user, bankAccount: null });

      await expect(service.create('user-1', { amount: 1000 })).rejects.toThrow(BadRequestException);
    });

    it('rechaza si el monto supera el saldo disponible', async () => {
      await expect(service.create('user-1', { amount: 200000 })).rejects.toThrow(BadRequestException);
    });

    it('crea la solicitud, guarda el snapshot bancario y emite el evento', async () => {
      const result = await service.create('user-1', { amount: 50000 });

      expect(result.status).toBe(WalletWithdrawalStatus.PENDING);
      expect(withdrawalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50000, bankAccountSnapshot: completeBankAccount }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith('wallet.withdrawal.requested', expect.objectContaining({ userId: 'user-1' }));
    });
  });

  describe('findOneForUser', () => {
    it('lanza ForbiddenException si la solicitud no pertenece al usuario', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', user: { id: 'other-user' } });

      await expect(service.findOneForUser('wd-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transiciones de estado', () => {
    it('permite pasar de PENDING a IN_PROCESS', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.PENDING, user });

      const result = await service.markInProcess('wd-1', 'admin-1');

      expect(result.status).toBe(WalletWithdrawalStatus.IN_PROCESS);
    });

    it('rechaza pasar a IN_PROCESS si ya está en proceso', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.IN_PROCESS, user });

      await expect(service.markInProcess('wd-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('rechaza modificar una solicitud ya pagada', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.PAID, user });

      await expect(service.markPaid('wd-1', 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.reject('wd-1', 'admin-1', 'motivo')).rejects.toThrow(BadRequestException);
    });

    it('rechaza modificar una solicitud ya rechazada', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.REJECTED, user });

      await expect(service.markPaid('wd-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('permite pagar directo desde PENDING y emite wallet.withdrawal.paid', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.PENDING, user, amount: 50000 });

      const result = await service.markPaid('wd-1', 'admin-1');

      expect(result.status).toBe(WalletWithdrawalStatus.PAID);
      expect(eventBus.emit).toHaveBeenCalledWith('wallet.withdrawal.paid', expect.objectContaining({ withdrawalId: 'wd-1' }));
    });

    it('rechaza con motivo y emite wallet.withdrawal.rejected', async () => {
      withdrawalRepo.findOne.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.PENDING, user, amount: 50000 });

      const result = await service.reject('wd-1', 'admin-1', 'Cuenta inválida');

      expect(result.status).toBe(WalletWithdrawalStatus.REJECTED);
      expect(result.rejectionReason).toBe('Cuenta inválida');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'wallet.withdrawal.rejected',
        expect.objectContaining({ reason: 'Cuenta inválida' }),
      );
    });
  });
});
