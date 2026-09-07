import { QueryFailedError } from 'typeorm';
import { BankInformationRequestListener } from './bank-information-request.listener';
import { BankInformationCompletionReason, BankInformationRequestStatus } from '../entities/bank-information-request-status.enum';

describe('BankInformationRequestListener', () => {
  let listener: BankInformationRequestListener;
  let userBankInformationRepo: any;
  let requestRepo: any;
  let notificationService: any;

  const payload = {
    contractId: 'contract-1',
    requestedTrackId: 'rt-1',
    trackTitle: 'Canción X',
    advanceAmount: 500000,
    participants: [
      { userId: 'user-1', name: 'Juan Pérez', email: 'juan@musila.com' },
      { userId: 'user-2', name: 'Ana López', email: 'ana@musila.com' },
    ],
  };

  beforeEach(() => {
    userBankInformationRepo = { findOne: jest.fn() };
    requestRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'req-1', ...data })),
    };
    notificationService = { notifyRequested: jest.fn().mockResolvedValue(undefined) };

    listener = new BankInformationRequestListener(userBankInformationRepo, requestRepo, notificationService);
  });

  it('crea la solicitud PENDING y notifica cuando el usuario no tiene perfil bancario', async () => {
    userBankInformationRepo.findOne.mockResolvedValue(null);

    await listener.handleRequested(payload as any);

    expect(requestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: BankInformationRequestStatus.PENDING, completionReason: null }),
    );
    expect(notificationService.notifyRequested).toHaveBeenCalledTimes(2);
  });

  it('crea la solicitud COMPLETED (already_configured) y NO notifica cuando el usuario ya tiene perfil', async () => {
    userBankInformationRepo.findOne.mockResolvedValue({ id: 'ubi-1' });

    await listener.handleRequested(payload as any);

    expect(requestRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: BankInformationRequestStatus.COMPLETED,
        completionReason: BankInformationCompletionReason.ALREADY_CONFIGURED,
      }),
    );
    expect(notificationService.notifyRequested).not.toHaveBeenCalled();
  });

  it('ignora un evento duplicado (UNIQUE user+licenseContract) sin lanzar ni notificar', async () => {
    userBankInformationRepo.findOne.mockResolvedValue(null);
    requestRepo.save.mockRejectedValueOnce(new QueryFailedError('INSERT', [], new Error('duplicate key')));

    await expect(
      listener.handleRequested({ ...payload, participants: [payload.participants[0]] } as any),
    ).resolves.toBeUndefined();
    expect(notificationService.notifyRequested).not.toHaveBeenCalled();
  });

  it('un fallo al procesar un participante no impide procesar a los demás', async () => {
    userBankInformationRepo.findOne
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(null);

    await listener.handleRequested(payload as any);

    expect(notificationService.notifyRequested).toHaveBeenCalledTimes(1);
  });
});
