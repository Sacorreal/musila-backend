import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LicenseContractsService } from './license-contracts.service';
import { LicenseContractStatus } from './entities/license-contract-status.enum';
import { LicenseContractPaymentStatus } from './entities/license-contract-payment-status.enum';
import { LicenseTerritoryMode } from './entities/license-territory-mode.enum';
import { LicenseDistributionFormat } from './entities/license-distribution-format.enum';
import { LicenseSignatoryRole } from './entities/license-signatory-role.enum';
import { LicenseSignatoryStatus } from './entities/license-signatory-status.enum';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { LicenseType } from 'src/requested-tracks/entities/license-type.enum';
import { SplitStatus } from 'src/splits/entities/split-status.enum';
import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';

describe('LicenseContractsService', () => {
  let service: LicenseContractsService;
  let contractRepo: any;
  let signatoryRepo: any;
  let requestedTrackRepo: any;
  let trackRepo: any;
  let splitRepo: any;
  let eventBus: { emit: jest.Mock };
  let otpVerificationService: { assertAndConsumeVerification: jest.Mock };
  let pdfGeneratorService: { generate: jest.Mock };
  let legalProofService: { generateProof: jest.Mock };
  let storageService: { uploadBuffer: jest.Mock };
  let licenseCollectionsService: { createInstallments: jest.Mock };

  const owner = { id: 'owner-1', name: 'Owner', lastName: 'Uno', email: 'owner@musila.com', citizenID: null, ipiNumber: null, proSociety: null, publisher: null };
  const requester = { id: 'req-1', name: 'Req', lastName: 'Uno', email: 'req@musila.com', citizenID: null };
  const track = {
    id: 'track-1',
    title: 'Mi Canción',
    genre: { genre: 'Pop' },
    language: 'es',
    iswc: null,
    externalsIds: [],
    authors: [owner],
  };
  const requestedTrack = {
    id: 'rt-1',
    owner,
    requester,
    track,
    licenseType: LicenseType.LICENCIA_DE_PRIMER_USO,
    status: RequestsStatus.PENDIENTE,
  };

  const futureDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const baseTermsDto = () => ({
    validityDate: futureDate(),
    territoryMode: LicenseTerritoryMode.GLOBAL,
    advanceAmount: 0,
    advanceInstallmentsCount: 1,
    royaltyPercentage: 15,
    distributionFormats: [LicenseDistributionFormat.STREAMING],
  });

  beforeEach(() => {
    contractRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => data),
      save: jest.fn((data: any) => Promise.resolve({ id: data.id ?? 'contract-1', ...data })),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
    signatoryRepo = {
      create: jest.fn((data: any) => data),
      save: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    requestedTrackRepo = { findOne: jest.fn().mockResolvedValue(requestedTrack), update: jest.fn().mockResolvedValue(undefined) };
    trackRepo = { update: jest.fn().mockResolvedValue(undefined) };
    splitRepo = { findOne: jest.fn().mockResolvedValue(null) };
    eventBus = { emit: jest.fn() };
    otpVerificationService = { assertAndConsumeVerification: jest.fn().mockResolvedValue(undefined) };
    pdfGeneratorService = { generate: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    legalProofService = {
      generateProof: jest.fn().mockResolvedValue({ legalProofId: 'proof-1', sha256Hash: 'hash-1' }),
    };
    storageService = { uploadBuffer: jest.fn().mockResolvedValue({ key: 'key-1', publicUrl: 'https://cdn/key-1' }) };
    licenseCollectionsService = { createInstallments: jest.fn().mockResolvedValue([]) };

    service = new LicenseContractsService(
      contractRepo,
      signatoryRepo,
      requestedTrackRepo,
      trackRepo,
      splitRepo,
      eventBus as any,
      otpVerificationService as any,
      pdfGeneratorService as any,
      legalProofService as any,
      storageService as any,
      licenseCollectionsService as any,
    );
  });

  describe('upsertTerms', () => {
    it('rechaza si el usuario no es el propietario', async () => {
      await expect(service.upsertTerms('rt-1', baseTermsDto() as any, 'intruso')).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si la solicitud no está pendiente', async () => {
      requestedTrackRepo.findOne.mockResolvedValue({ ...requestedTrack, status: RequestsStatus.APROBADA });

      await expect(service.upsertTerms('rt-1', baseTermsDto() as any, 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('rechaza si la suma de las cuotas no coincide con el anticipo', async () => {
      contractRepo.findOne.mockResolvedValue(null);
      const dto = {
        ...baseTermsDto(),
        advanceAmount: 1000000,
        installments: [{ amount: 900000, dueDate: futureDate() }],
      };

      await expect(service.upsertTerms('rt-1', dto as any, 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('exige distribución del anticipo cuando hay coautores', async () => {
      contractRepo.findOne.mockResolvedValue(null);
      splitRepo.findOne.mockResolvedValue({
        status: SplitStatus.COMPLETED,
        authors: [
          { id: 'sa-1', user: owner, percentage: 50, role: CoauthorRole.COMPOSITOR },
          { id: 'sa-2', user: requester, percentage: 50, role: CoauthorRole.AUTOR },
        ],
      });
      const dto = {
        ...baseTermsDto(),
        advanceAmount: 1000000,
        installments: [{ amount: 1000000, dueDate: futureDate() }],
      };

      await expect(service.upsertTerms('rt-1', dto as any, 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('calcula la comisión del 10% y deja paymentStatus PENDIENTE cuando hay anticipo', async () => {
      contractRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'contract-1', requestedTrack, signatories: [] });

      const dto = {
        ...baseTermsDto(),
        advanceAmount: 1000000,
        installments: [{ amount: 1000000, dueDate: futureDate() }],
      };

      await service.upsertTerms('rt-1', dto as any, 'owner-1');

      expect(contractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionAmount: 100000,
          totalPayableByLicensee: 1100000,
          paymentStatus: LicenseContractPaymentStatus.PENDIENTE,
          status: LicenseContractStatus.DRAFT,
        }),
      );
    });

    it('deja paymentStatus APROBADA cuando no hay anticipo', async () => {
      contractRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'contract-1', requestedTrack, signatories: [] });

      await service.upsertTerms('rt-1', baseTermsDto() as any, 'owner-1');

      expect(contractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: LicenseContractPaymentStatus.APROBADA }),
      );
    });
  });

  describe('generatePreview', () => {
    const draftContract = () => ({
      id: 'contract-1',
      status: LicenseContractStatus.DRAFT,
      requestedTrack,
      validityDate: new Date(futureDate()),
      territoryMode: LicenseTerritoryMode.GLOBAL,
      territoryCountries: null,
      advanceAmount: 0,
      advanceCurrency: 'COP',
      advanceInstallments: null,
      commissionAmount: 0,
      totalPayableByLicensee: 0,
      royaltyPercentage: 15,
      distributionFormats: [LicenseDistributionFormat.STREAMING],
      advanceDistribution: null,
      generatedAt: null,
      signatories: [],
    });

    it('rechaza si el usuario no es el propietario', async () => {
      contractRepo.findOne.mockResolvedValue(draftContract());

      await expect(service.generatePreview('contract-1', 'intruso')).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si el contrato no está en DRAFT', async () => {
      contractRepo.findOne.mockResolvedValue({ ...draftContract(), status: LicenseContractStatus.SIGNED });

      await expect(service.generatePreview('contract-1', 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('genera el documento, crea firmantes y emite el evento de preview', async () => {
      contractRepo.findOne
        .mockResolvedValueOnce(draftContract())
        .mockResolvedValueOnce({ ...draftContract(), status: LicenseContractStatus.AWAITING_SIGNATURES, signatories: [
          { id: 'sig-1', user: owner, role: LicenseSignatoryRole.AUTOR_PRINCIPAL, status: LicenseSignatoryStatus.PENDING },
          { id: 'sig-2', user: requester, role: LicenseSignatoryRole.LICENCIATARIO, status: LicenseSignatoryStatus.PENDING },
        ] });

      const result = await service.generatePreview('contract-1', 'owner-1');

      expect(pdfGeneratorService.generate).toHaveBeenCalled();
      expect(storageService.uploadBuffer).toHaveBeenCalled();
      expect(signatoryRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: LicenseSignatoryRole.AUTOR_PRINCIPAL }),
          expect.objectContaining({ role: LicenseSignatoryRole.LICENCIATARIO }),
        ]),
      );
      expect(contractRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: LicenseContractStatus.AWAITING_SIGNATURES }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'license.contract.preview.generated',
        expect.objectContaining({ contractId: 'contract-1' }),
      );
      expect(result.signatories).toHaveLength(2);
    });
  });

  describe('signAsParty / completeContract', () => {
    const awaitingContract = () => ({
      id: 'contract-1',
      status: LicenseContractStatus.AWAITING_SIGNATURES,
      requestedTrack,
      validityDate: new Date(futureDate()),
      territoryMode: LicenseTerritoryMode.GLOBAL,
      territoryCountries: null,
      advanceAmount: 0,
      advanceCurrency: 'COP',
      advanceInstallments: null,
      commissionAmount: 0,
      totalPayableByLicensee: 0,
      royaltyPercentage: 15,
      distributionFormats: [LicenseDistributionFormat.STREAMING],
      advanceDistribution: null,
      documentUrl: null,
      signatories: [
        { id: 'sig-1', user: owner, role: LicenseSignatoryRole.AUTOR_PRINCIPAL, status: LicenseSignatoryStatus.SIGNED, signedAt: new Date() },
        { id: 'sig-2', user: requester, role: LicenseSignatoryRole.LICENCIATARIO, status: LicenseSignatoryStatus.PENDING },
      ],
    });

    it('exige verificación OTP antes de firmar', async () => {
      contractRepo.findOne.mockResolvedValue(awaitingContract());

      await service.signAsParty('contract-1', 'sig-2', requester.id, '127.0.0.1', 'jest');

      expect(otpVerificationService.assertAndConsumeVerification).toHaveBeenCalledWith(
        requester.id,
        'license-contract-signing',
        'sig-2',
      );
    });

    it('completa el contrato, genera evidencia legal y aprueba la solicitud cuando firma el último pendiente', async () => {
      const signedByAll = () => {
        const contract: any = awaitingContract();
        contract.signatories = contract.signatories.map((signatory: any) => ({
          ...signatory,
          status: LicenseSignatoryStatus.SIGNED,
          signedAt: new Date(),
        }));
        return contract;
      };

      contractRepo.findOne
        .mockResolvedValueOnce(awaitingContract()) // signAsParty
        .mockResolvedValueOnce(signedByAll()) // completeContract (privado): ya persistido con todas las firmas
        .mockResolvedValueOnce({ ...awaitingContract(), status: LicenseContractStatus.SIGNED }); // resultado final

      await service.signAsParty('contract-1', 'sig-2', requester.id, '127.0.0.1', 'jest');

      expect(legalProofService.generateProof).toHaveBeenCalledWith(
        expect.objectContaining({ context: expect.objectContaining({ entityType: 'contract', entityId: 'contract-1' }) }),
      );
      expect(requestedTrackRepo.update).toHaveBeenCalledWith('rt-1', expect.objectContaining({ status: RequestsStatus.APROBADA }));
      expect(eventBus.emit).toHaveBeenCalledWith('license.contract.signed', expect.objectContaining({ contractId: 'contract-1' }));
    });
  });

  describe('rejectSignatory', () => {
    it('reinicia el contrato a DRAFT cuando una parte rechaza', async () => {
      contractRepo.findOne
        .mockResolvedValueOnce({
          id: 'contract-1',
          status: LicenseContractStatus.AWAITING_SIGNATURES,
          requestedTrack,
          signatories: [
            { id: 'sig-1', user: requester, role: LicenseSignatoryRole.LICENCIATARIO, status: LicenseSignatoryStatus.PENDING },
          ],
        })
        .mockResolvedValueOnce({ id: 'contract-1', status: LicenseContractStatus.DRAFT, requestedTrack, signatories: [] });

      await service.rejectSignatory('contract-1', 'sig-1', requester.id, { reason: 'No estoy de acuerdo' });

      expect(contractRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: LicenseContractStatus.DRAFT }));
      expect(eventBus.emit).toHaveBeenCalledWith(
        'license.contract.signatory.rejected',
        expect.objectContaining({ reason: 'No estoy de acuerdo' }),
      );
    });
  });

  describe('confirmRecording', () => {
    it('rechaza si el usuario no es parte del contrato', async () => {
      contractRepo.findOne.mockResolvedValue({
        id: 'contract-1',
        status: LicenseContractStatus.EXPIRED,
        requestedTrack,
        validityDate: new Date(Date.now() - 1000),
        signatories: [],
      });

      await expect(
        service.confirmRecording('contract-1', 'intruso', { isrc: 'US-ABC-27-00001' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('marca el contrato como FULFILLED y oculta el track cuando el requester confirma el ISRC', async () => {
      contractRepo.findOne
        .mockResolvedValueOnce({
          id: 'contract-1',
          status: LicenseContractStatus.EXPIRED,
          requestedTrack,
          validityDate: new Date(Date.now() - 1000),
          signatories: [],
        })
        .mockResolvedValueOnce({ id: 'contract-1', status: LicenseContractStatus.FULFILLED, requestedTrack, signatories: [] });

      await service.confirmRecording('contract-1', requester.id, { isrc: 'US-ABC-27-00001' });

      expect(trackRepo.update).toHaveBeenCalledWith(
        'track-1',
        expect.objectContaining({ isAvailable: false }),
      );
      expect(contractRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: LicenseContractStatus.FULFILLED }));
      expect(eventBus.emit).toHaveBeenCalledWith(
        'license.contract.fulfilled',
        expect.objectContaining({ isrc: 'US-ABC-27-00001' }),
      );
    });
  });
});
