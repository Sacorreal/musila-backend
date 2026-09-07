import { BankInformationService } from './bank-information.service';
import { BankInformationMethod } from './entities/bank-information-method.enum';
import { BankInformationCompletionReason, BankInformationRequestStatus } from './entities/bank-information-request-status.enum';

describe('BankInformationService', () => {
  let service: BankInformationService;
  let bankTransferProvider: any;
  let userBankInformationRepo: any;
  let requestRepo: any;
  let cipher: any;
  let eventBus: { emit: jest.Mock };

  beforeEach(() => {
    bankTransferProvider = {
      listBanks: jest.fn().mockResolvedValue([{ id: '1007', name: 'BANCOLOMBIA' }]),
      listAccountTypes: jest.fn().mockReturnValue([{ value: 'AHORROS', label: 'Ahorros' }]),
      listDocumentTypes: jest.fn().mockReturnValue([{ value: 'CC', label: 'Cédula de ciudadanía' }]),
    };
    userBankInformationRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'ubi-1', updatedAt: new Date(), ...data })),
    };
    requestRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    cipher = {
      encrypt: jest.fn((plaintext: string) => `enc:${plaintext}`),
      decrypt: jest.fn((serialized: string) => serialized.replace(/^enc:/, '')),
    };
    eventBus = { emit: jest.fn() };

    service = new BankInformationService(
      bankTransferProvider,
      userBankInformationRepo,
      requestRepo,
      cipher,
      eventBus as any,
    );
  });

  describe('getTransferOptions', () => {
    it('delega en el BankTransferProvider inyectado', async () => {
      const result = await service.getTransferOptions();
      expect(result.banks).toEqual([{ id: '1007', name: 'BANCOLOMBIA' }]);
      expect(bankTransferProvider.listBanks).toHaveBeenCalled();
    });
  });

  describe('getPendingStatus', () => {
    it('retorna pending:false si no hay solicitud pendiente', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(service.getPendingStatus('user-1')).resolves.toEqual({ pending: false });
    });

    it('retorna pending:true con los datos de la solicitud más reciente', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: 'req-1',
        trackTitle: 'Canción X',
        advanceAmount: '500000.00',
        licenseContract: { id: 'contract-1' },
      });
      await expect(service.getPendingStatus('user-1')).resolves.toEqual({
        pending: true,
        request: { requestId: 'req-1', contractId: 'contract-1', trackTitle: 'Canción X', advanceAmount: 500000 },
      });
    });
  });

  describe('saveColombia', () => {
    it('cifra y persiste el perfil y marca las solicitudes pendientes como completadas', async () => {
      const dto = {
        bankId: '1007',
        bankName: 'BANCOLOMBIA',
        accountType: 'AHORROS' as const,
        accountNumber: '1234567890',
        accountHolderName: 'Juan Pérez',
        accountHolderIdType: 'CC' as const,
        accountHolderIdNumber: '123456789',
      };

      const result = await service.saveColombia('user-1', dto);

      expect(cipher.encrypt).toHaveBeenCalled();
      expect(userBankInformationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ method: BankInformationMethod.WOMPI_COLOMBIA }),
      );
      expect(requestRepo.update).toHaveBeenCalledWith(
        { user: { id: 'user-1' }, status: BankInformationRequestStatus.PENDING },
        expect.objectContaining({
          status: BankInformationRequestStatus.COMPLETED,
          completionReason: BankInformationCompletionReason.SUBMITTED,
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'wallet.bank_information.completed',
        expect.objectContaining({ userId: 'user-1', method: BankInformationMethod.WOMPI_COLOMBIA }),
      );
      expect(result.data).toEqual(dto);
    });
  });

  describe('saveForeign', () => {
    it('persiste la fecha de aceptación de avisos legales', async () => {
      const dto = {
        countryCallingCode: '+57',
        phoneNumber: '3001234567',
        email: 'user@example.com',
        global66Username: '@juanperez',
        acceptedLegalNotice: true as const,
      };

      await service.saveForeign('user-1', dto);

      expect(userBankInformationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          method: BankInformationMethod.GLOBAL66_INTERNATIONAL,
          legalNoticeAcceptedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getMyBankInformation', () => {
    it('retorna null si el usuario no tiene perfil', async () => {
      userBankInformationRepo.findOne.mockResolvedValue(null);
      await expect(service.getMyBankInformation('user-1')).resolves.toBeNull();
    });

    it('descifra el payload almacenado', async () => {
      userBankInformationRepo.findOne.mockResolvedValue({
        method: BankInformationMethod.WOMPI_COLOMBIA,
        encryptedPayload: `enc:${JSON.stringify({ bankId: '1007' })}`,
        legalNoticeAcceptedAt: null,
        updatedAt: new Date('2026-01-01'),
      });
      const result = await service.getMyBankInformation('user-1');
      expect(result?.data).toEqual({ bankId: '1007' });
    });
  });
});
