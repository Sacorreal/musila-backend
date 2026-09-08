import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { LicenseType } from 'src/requested-tracks/entities/license-type.enum';
import { Track } from 'src/tracks/entities/track.entity';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { User } from 'src/users/entities/user.entity';
import { Split } from 'src/splits/entities/split.entity';
import { SplitStatus } from 'src/splits/entities/split-status.enum';
import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { OtpVerificationService } from 'src/shared/otp-verification/otp-verification.service';
import { OtpPurpose } from 'src/shared/otp-verification/otp-purpose.enum';
import { PdfGeneratorService } from 'src/shared/pdf/services/pdf-generator.service';
import { PdfBodyContentType } from 'src/shared/pdf/enums/pdf-body-content-type.enum';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';
import { LegalIdentityService } from 'src/legal-identity/legal-identity.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { LicenseCollectionsService } from 'src/license-collections/license-collections.service';
import { PublisherCommissionFreezeService } from 'src/wallet/services/publisher-commission-freeze.service';
import { LICENSE_COMMISSION_RATE } from 'src/shared/billing/license-commission.constants';

import { LicenseContract } from './entities/license-contract.entity';
import { LicenseContractSignatory } from './entities/license-contract-signatory.entity';
import { LicenseContractStatus } from './entities/license-contract-status.enum';
import { LicenseContractPaymentStatus } from './entities/license-contract-payment-status.enum';
import { LicenseTerritoryMode } from './entities/license-territory-mode.enum';
import { LicenseSignatoryRole } from './entities/license-signatory-role.enum';
import { LicenseSignatoryStatus } from './entities/license-signatory-status.enum';
import { UpsertLicenseContractTermsDto } from './dto/upsert-license-contract-terms.dto';
import { RejectLicenseSignatoryDto } from './dto/reject-license-signatory.dto';
import { ConfirmRecordingDto } from './dto/confirm-recording.dto';
import { buildLicenseContractParagraphs } from './templates/license-contract.template';

const CONTRACT_RELATIONS = [
  'requestedTrack',
  'requestedTrack.owner',
  'requestedTrack.requester',
  'requestedTrack.track',
  'requestedTrack.track.genre',
  'requestedTrack.track.authors',
  'signatories',
  'signatories.user',
];

const COAUTHOR_ROLE_LABELS: Record<CoauthorRole, string> = {
  [CoauthorRole.COMPOSITOR]: 'Compositor',
  [CoauthorRole.AUTOR]: 'Autor',
  [CoauthorRole.COMPOSITOR_AUTOR]: 'Compositor y autor',
  [CoauthorRole.ADAPTADOR]: 'Adaptador',
  [CoauthorRole.ARREGLISTA]: 'Arreglista',
  [CoauthorRole.TRADUCTOR]: 'Traductor',
};

const SIGNATORY_ROLE_LABELS: Record<LicenseSignatoryRole, string> = {
  [LicenseSignatoryRole.AUTOR_PRINCIPAL]: 'EL LICENCIANTE',
  [LicenseSignatoryRole.COAUTOR]: 'COAUTOR',
  [LicenseSignatoryRole.LICENCIATARIO]: 'EL LICENCIATARIO',
};

interface AuthorEntry {
  user: User;
  role: LicenseSignatoryRole;
  roleLabel: string;
  percentage: number;
  splitAuthorId: string | null;
}

/** Datos de la grabación que se vuelcan al expediente al cumplirse la licencia. */
interface RecordingDetails {
  isrc: string;
  upc?: string | null;
  mainArtistName?: string | null;
  albumOrEpName?: string | null;
  releaseDate?: string | null;
}

@Injectable()
export class LicenseContractsService {
  private readonly logger = new Logger(LicenseContractsService.name);

  constructor(
    @InjectRepository(LicenseContract)
    private readonly contractRepo: Repository<LicenseContract>,
    @InjectRepository(LicenseContractSignatory)
    private readonly signatoryRepo: Repository<LicenseContractSignatory>,
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(RegistrationFile)
    private readonly registrationFileRepo: Repository<RegistrationFile>,
    @InjectRepository(Split)
    private readonly splitRepo: Repository<Split>,
    private readonly eventBus: EventBusService,
    private readonly otpVerificationService: OtpVerificationService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly legalProofService: LegalProofService,
    private readonly storageService: StorageService,
    private readonly licenseCollectionsService: LicenseCollectionsService,
    private readonly publisherCommissionFreezeService: PublisherCommissionFreezeService,
    private readonly legalIdentityService: LegalIdentityService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos públicos
  // ─────────────────────────────────────────────────────────────────────────────

  /** Crea o actualiza (en DRAFT) los términos de la sección 3.4 sobre una solicitud pendiente. */
  async upsertTerms(
    requestedTrackId: string,
    dto: UpsertLicenseContractTermsDto,
    ownerId: string,
  ): Promise<LicenseContract> {
    const requestedTrack = await this.requestedTrackRepo.findOne({
      where: { id: requestedTrackId },
      relations: ['owner', 'requester', 'track'],
    });
    if (!requestedTrack) throw new NotFoundException('La solicitud no existe');
    if (requestedTrack.owner.id !== ownerId) {
      throw new ForbiddenException('Solo el propietario de la canción puede definir los términos de la licencia');
    }
    if (requestedTrack.licenseType !== LicenseType.LICENCIA_DE_PRIMER_USO) {
      throw new BadRequestException('Esta solicitud no es de tipo Licencia de Primer Uso');
    }
    if (requestedTrack.status !== RequestsStatus.PENDIENTE) {
      throw new BadRequestException('Solo se pueden definir términos sobre solicitudes pendientes');
    }

    const validityDate = new Date(dto.validityDate);
    if (validityDate.getTime() <= Date.now()) {
      throw new BadRequestException('La fecha de vigencia debe ser futura');
    }

    if (
      dto.territoryMode === LicenseTerritoryMode.SPECIFIC_COUNTRIES &&
      (!dto.territoryCountries || dto.territoryCountries.length === 0)
    ) {
      throw new BadRequestException('Debes seleccionar al menos un país para un territorio específico');
    }

    const split = await this.splitRepo.findOne({
      where: { track: { id: requestedTrack.track.id } },
      relations: ['authors', 'authors.user'],
    });
    const hasCoauthors = !!split && split.status === SplitStatus.COMPLETED && split.authors.length > 1;

    let installments: { amount: number; dueDate: string }[] = [];
    let advanceDistribution: { userId: string; percentage: number }[] | null = null;

    if (dto.advanceAmount > 0) {
      if (!dto.installments || dto.installments.length !== dto.advanceInstallmentsCount) {
        throw new BadRequestException('Debes indicar el monto y la fecha de pago de cada cuota del anticipo');
      }
      const installmentsSum = dto.installments.reduce((sum, installment) => sum + installment.amount, 0);
      if (this.roundCurrency(installmentsSum) !== this.roundCurrency(dto.advanceAmount)) {
        throw new BadRequestException('La suma de las cuotas debe ser igual al anticipo');
      }
      for (const installment of dto.installments) {
        if (new Date(installment.dueDate).getTime() <= Date.now()) {
          throw new BadRequestException('La fecha de pago de cada cuota debe ser futura');
        }
      }
      installments = dto.installments.map((installment) => ({
        amount: installment.amount,
        dueDate: installment.dueDate,
      }));

      if (hasCoauthors) {
        if (!dto.advanceDistribution || dto.advanceDistribution.length === 0) {
          throw new BadRequestException('Debes distribuir el anticipo por porcentaje entre los coautores');
        }
        const distributionSum = dto.advanceDistribution.reduce((sum, entry) => sum + entry.percentage, 0);
        if (this.roundCurrency(distributionSum) !== 100) {
          throw new BadRequestException('La distribución del anticipo debe sumar exactamente 100%');
        }
        const splitUserIds = new Set(
          split.authors.filter((author) => author.user).map((author) => author.user.id),
        );
        const distributionUserIds = new Set(dto.advanceDistribution.map((entry) => entry.userId));
        const allAreAuthors = dto.advanceDistribution.every((entry) => splitUserIds.has(entry.userId));
        if (!allAreAuthors || distributionUserIds.size !== dto.advanceDistribution.length) {
          throw new BadRequestException('La distribución del anticipo solo puede incluir a los autores del split, sin duplicados');
        }
        advanceDistribution = dto.advanceDistribution;
      }
    } else if (dto.advanceInstallmentsCount !== 1) {
      throw new BadRequestException('No puede haber cuotas si no hay anticipo');
    }

    const commissionAmount = this.roundCurrency(dto.advanceAmount * LICENSE_COMMISSION_RATE);
    const totalPayableByLicensee = this.roundCurrency(dto.advanceAmount + commissionAmount);
    const paymentStatus =
      dto.advanceAmount > 0 ? LicenseContractPaymentStatus.PENDIENTE : LicenseContractPaymentStatus.APROBADA;

    let contract = await this.contractRepo.findOne({
      where: { requestedTrack: { id: requestedTrackId } },
      relations: ['signatories'],
    });

    if (contract && [LicenseContractStatus.SIGNED, LicenseContractStatus.FULFILLED].includes(contract.status)) {
      throw new BadRequestException('No se puede editar un contrato que ya fue firmado');
    }

    if (contract?.signatories?.length) {
      await this.signatoryRepo.remove(contract.signatories);
    }

    const values: Partial<LicenseContract> = {
      validityDate,
      territoryMode: dto.territoryMode,
      territoryCountries:
        dto.territoryMode === LicenseTerritoryMode.SPECIFIC_COUNTRIES ? (dto.territoryCountries ?? []) : null,
      advanceAmount: dto.advanceAmount,
      advanceCurrency: 'COP',
      advanceInstallmentsCount: dto.advanceAmount > 0 ? dto.advanceInstallmentsCount : 1,
      advanceInstallments: dto.advanceAmount > 0 ? installments : null,
      commissionRate: LICENSE_COMMISSION_RATE,
      commissionAmount,
      totalPayableByLicensee,
      royaltyPercentage: dto.royaltyPercentage,
      distributionFormats: dto.distributionFormats,
      advanceDistribution,
      hasCustomInfo: dto.hasCustomInfo ?? false,
      customInfo: dto.hasCustomInfo ? (dto.customInfo ?? null) : null,
      customAmount: dto.hasCustomInfo ? (dto.customAmount ?? null) : null,
      customCurrency: dto.hasCustomInfo ? (dto.customCurrency ?? null) : null,
      status: LicenseContractStatus.DRAFT,
      paymentStatus,
      documentKey: null,
      documentUrl: null,
      legalProofId: null,
      contractHash: null,
      generatedAt: null,
      fullySignedAt: null,
    };

    if (contract) {
      Object.assign(contract, values);
    } else {
      contract = this.contractRepo.create({
        ...values,
        requestedTrack,
        createdBy: { id: ownerId } as User,
      });
    }

    const saved = await this.contractRepo.save(contract);

    this.eventBus.emit('license.contract.terms.saved', {
      contractId: saved.id,
      requestedTrackId,
      ownerId,
      trackTitle: requestedTrack.track.title,
    });

    return this.findContractWithRelationsOrFail(saved.id);
  }

  /** Ensambla el documento (PDF), lo sube al storage y crea las filas de firmantes. */
  async generatePreview(contractId: string, ownerId: string): Promise<LicenseContract> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    if (contract.requestedTrack.owner.id !== ownerId) {
      throw new ForbiddenException('Solo el propietario puede generar el documento');
    }
    if (contract.status !== LicenseContractStatus.DRAFT) {
      throw new BadRequestException('Solo se puede generar el documento desde un borrador');
    }

    const track = contract.requestedTrack.track;
    const split = await this.splitRepo.findOne({
      where: { track: { id: track.id } },
      relations: ['authors', 'authors.user'],
    });
    const authorEntries = this.resolveAuthorEntries(split, track, contract.requestedTrack.owner.id);

    const paragraphs = buildLicenseContractParagraphs(this.buildTemplateInput(contract, authorEntries));

    const buffer = await this.pdfGeneratorService.generate({
      documentTitle: `Licencia de Primer Uso — ${track.title}`,
      body: { type: PdfBodyContentType.TEXT, paragraphs },
      metadata: { title: `Licencia de Primer Uso — ${track.title}`, author: 'Músila', generatedAt: new Date() },
    });

    const upload = await this.storageService.uploadBuffer({
      key: `license-contracts/${contract.id}/preview.pdf`,
      buffer,
      contentType: 'application/pdf',
    });

    const signatories = authorEntries.map((entry) =>
      this.signatoryRepo.create({
        licenseContract: contract,
        user: entry.user,
        role: entry.role,
        splitAuthorId: entry.splitAuthorId,
      }),
    );
    signatories.push(
      this.signatoryRepo.create({
        licenseContract: contract,
        user: contract.requestedTrack.requester,
        role: LicenseSignatoryRole.LICENCIATARIO,
        splitAuthorId: null,
      }),
    );
    await this.signatoryRepo.save(signatories);

    contract.documentKey = upload.key;
    contract.documentUrl = upload.publicUrl;
    contract.status = LicenseContractStatus.AWAITING_SIGNATURES;
    contract.generatedAt = new Date();
    await this.contractRepo.save(contract);

    const result = await this.findContractWithRelationsOrFail(contract.id);

    this.eventBus.emit('license.contract.preview.generated', {
      contractId: result.id,
      requestedTrackId: result.requestedTrack.id,
      trackTitle: track.title,
      signatories: result.signatories.map((signatory) => ({
        userId: signatory.user.id,
        name: `${signatory.user.name} ${signatory.user.lastName}`.trim(),
        email: signatory.user.email,
        roleLabel: this.roleLabel(signatory.role),
      })),
    });

    return result;
  }

  /** Firma electrónica de una parte individual (requiere OTP ya verificado). */
  async signAsParty(
    contractId: string,
    signatoryId: string,
    userId: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<LicenseContract> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    const signatory = contract.signatories.find((item) => item.id === signatoryId);
    if (!signatory) throw new NotFoundException('El firmante no existe en este contrato');
    if (signatory.user.id !== userId) throw new ForbiddenException('No puedes firmar en nombre de otro usuario');
    if (signatory.status !== LicenseSignatoryStatus.PENDING) {
      throw new BadRequestException('Tu firma ya fue procesada');
    }
    if (contract.status !== LicenseContractStatus.AWAITING_SIGNATURES) {
      throw new BadRequestException('Este contrato no está esperando firmas');
    }

    await this.otpVerificationService.assertAndConsumeVerification(
      userId,
      OtpPurpose.LICENSE_CONTRACT_SIGNING,
      signatoryId,
    );

    signatory.status = LicenseSignatoryStatus.SIGNED;
    signatory.signedAt = new Date();
    signatory.ipAddress = ipAddress;
    signatory.userAgent = userAgent;
    signatory.legalIdentitySnapshot = await this.legalIdentityService.buildEncryptedSnapshot(userId);
    await this.signatoryRepo.save(signatory);

    const allSigned = contract.signatories.every(
      (item) => item.id === signatory.id || item.status === LicenseSignatoryStatus.SIGNED,
    );

    this.eventBus.emit('license.contract.signatory.signed', {
      contractId: contract.id,
      signatoryId: signatory.id,
      userId,
      userName: `${signatory.user.name} ${signatory.user.lastName}`.trim(),
      roleLabel: this.roleLabel(signatory.role),
      trackTitle: contract.requestedTrack.track.title,
      allSigned,
    });

    if (allSigned) {
      await this.completeContract(contract.id);
    }

    return this.findContractWithRelationsOrFail(contractId);
  }

  /** Rechazo de una parte: el contrato vuelve a DRAFT; el owner debe editar y reenviar. */
  async rejectSignatory(
    contractId: string,
    signatoryId: string,
    userId: string,
    dto: RejectLicenseSignatoryDto,
  ): Promise<LicenseContract> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    const signatory = contract.signatories.find((item) => item.id === signatoryId);
    if (!signatory) throw new NotFoundException('El firmante no existe en este contrato');
    if (signatory.user.id !== userId) throw new ForbiddenException('No puedes rechazar en nombre de otro usuario');
    if (signatory.status !== LicenseSignatoryStatus.PENDING) {
      throw new BadRequestException('Tu participación ya fue procesada');
    }

    signatory.status = LicenseSignatoryStatus.REJECTED;
    signatory.rejectionReason = dto.reason;
    await this.signatoryRepo.save(signatory);

    contract.status = LicenseContractStatus.DRAFT;
    contract.generatedAt = null;
    await this.contractRepo.save(contract);

    this.eventBus.emit('license.contract.signatory.rejected', {
      contractId: contract.id,
      signatoryId: signatory.id,
      userId,
      userName: `${signatory.user.name} ${signatory.user.lastName}`.trim(),
      reason: dto.reason,
      trackTitle: contract.requestedTrack.track.title,
      ownerId: contract.requestedTrack.owner.id,
      ownerEmail: contract.requestedTrack.owner.email,
      ownerName: contract.requestedTrack.owner.name,
    });

    return this.findContractWithRelationsOrFail(contractId);
  }

  /**
   * Owner o requester confirman manualmente que la grabación ya tiene ISRC
   * asignado, tras el vencimiento de la vigencia sin que el sistema lo
   * detectara automáticamente (p. ej. registrado con el distribuidor sin
   * reflejarse aún en Músila).
   */
  async confirmRecording(contractId: string, userId: string, dto: ConfirmRecordingDto): Promise<LicenseContract> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    const isOwner = contract.requestedTrack.owner.id === userId;
    const isRequester = contract.requestedTrack.requester.id === userId;
    if (!isOwner && !isRequester) {
      throw new ForbiddenException('No tienes permisos sobre este contrato');
    }
    if (contract.status === LicenseContractStatus.FULFILLED) {
      throw new BadRequestException('Esta licencia ya fue marcada como cumplida');
    }
    if (contract.status !== LicenseContractStatus.EXPIRED && contract.validityDate.getTime() > Date.now()) {
      throw new BadRequestException('Aún no ha vencido la vigencia de esta licencia');
    }

    const track = contract.requestedTrack.track;
    const updatedExternalsIds = this.upsertExternalIds(track.externalsIds ?? [], {
      ISRC: dto.isrc,
      UPC: dto.upc,
    });

    await this.trackRepo.update(track.id, { externalsIds: updatedExternalsIds, isAvailable: false });

    await this.syncRecordingToRegistrationFile(track.id, dto);

    contract.status = LicenseContractStatus.FULFILLED;
    contract.fulfilledAt = new Date();
    await this.contractRepo.save(contract);

    await this.registerIsrcLegalProof(contract, dto, userId);

    const otherParty = isOwner ? contract.requestedTrack.requester : contract.requestedTrack.owner;

    this.eventBus.emit('license.contract.fulfilled', {
      contractId: contract.id,
      requestedTrackId: contract.requestedTrack.id,
      trackTitle: track.title,
      confirmedByUserId: userId,
      otherPartyId: otherParty.id,
      otherPartyEmail: otherParty.email,
      otherPartyName: otherParty.name,
      isrc: dto.isrc,
    });

    return this.findContractWithRelationsOrFail(contractId);
  }

  async findForRequestedTrack(requestedTrackId: string, userId: string): Promise<LicenseContract> {
    const contract = await this.contractRepo.findOne({
      where: { requestedTrack: { id: requestedTrackId } },
      relations: CONTRACT_RELATIONS,
    });
    if (!contract) throw new NotFoundException('No hay un contrato de licencia generado para esta solicitud');
    this.assertCanView(contract, userId);
    return contract;
  }

  async findOne(contractId: string, userId: string): Promise<LicenseContract> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    this.assertCanView(contract, userId);
    return contract;
  }

  async cancel(contractId: string, ownerId: string): Promise<void> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    if (contract.requestedTrack.owner.id !== ownerId) {
      throw new ForbiddenException('Solo el propietario puede cancelar el borrador');
    }
    if (contract.status !== LicenseContractStatus.DRAFT) {
      throw new BadRequestException('Solo se puede cancelar un contrato en borrador');
    }
    await this.contractRepo.softDelete(contract.id);
  }

  /** Cuotas del anticipo asociadas al contrato (para que owner/requester las consulten y paguen). */
  async findInstallments(contractId: string, userId: string) {
    const contract = await this.findOne(contractId, userId);
    return this.licenseCollectionsService.findByLicenseContract(contract.id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Usado por el cron de expiración
  // ─────────────────────────────────────────────────────────────────────────────

  async findSignedContractsPastValidity(): Promise<LicenseContract[]> {
    return this.contractRepo
      .createQueryBuilder('contract')
      .leftJoinAndSelect('contract.requestedTrack', 'requestedTrack')
      .leftJoinAndSelect('requestedTrack.owner', 'owner')
      .leftJoinAndSelect('requestedTrack.requester', 'requester')
      .leftJoinAndSelect('requestedTrack.track', 'track')
      .where('contract.status = :status', { status: LicenseContractStatus.SIGNED })
      .andWhere('contract.validityDate < :now', { now: new Date() })
      .getMany();
  }

  /**
   * Evalúa una licencia SIGNED cuya vigencia venció: si el track ya tiene
   * ISRC asignado (p. ej. añadido directamente en la ficha del track), se da
   * por cumplida automáticamente; si no, se marca EXPIRED y se notifica a
   * ambas partes para que confirmen manualmente si tienen el ISRC.
   */
  async evaluateValidityForContract(contract: LicenseContract): Promise<void> {
    const track = contract.requestedTrack.track;
    const isrcEntry = (track.externalsIds ?? []).find((entry) => entry.type === 'ISRC');

    if (isrcEntry) {
      await this.trackRepo.update(track.id, { isAvailable: false });
      contract.status = LicenseContractStatus.FULFILLED;
      contract.fulfilledAt = new Date();
      await this.contractRepo.save(contract);
      await this.registerIsrcLegalProof(contract, { isrc: isrcEntry.value });
      return;
    }

    await this.markExpired(contract);
  }

  /** Evidencia legal del ISRC confirmado (manual o detectado automáticamente): hash + timestamp de un snapshot del hecho. */
  private async registerIsrcLegalProof(
    contract: LicenseContract,
    recording: RecordingDetails,
    confirmedByUserId?: string,
  ): Promise<void> {
    const snapshot = {
      event: 'license.contract.fulfilled',
      contractId: contract.id,
      trackId: contract.requestedTrack.track.id,
      isrc: recording.isrc,
      upc: recording.upc ?? null,
      mainArtistName: recording.mainArtistName ?? null,
      albumOrEpName: recording.albumOrEpName ?? null,
      releaseDate: recording.releaseDate ?? null,
      confirmedByUserId: confirmedByUserId ?? null,
      fulfilledAt: contract.fulfilledAt,
    };
    const buffer = Buffer.from(JSON.stringify(snapshot));
    const fileName = `isrc-${contract.id}.json`;

    try {
      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: 'application/json' },
        metadataPayload: { size: buffer.length, mimeType: 'application/json', fileName },
        context: {
          entityType: LegalEntityType.ISRC_REGISTRATION,
          entityId: contract.requestedTrack.track.id,
          requestedByUserId: confirmedByUserId,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo generar evidencia legal para el ISRC del contrato ${contract.id}`, error as Error);
    }
  }

  /**
   * Descifra el snapshot de identidad legal capturado en el momento de la
   * firma de cada firmante (§7), para vincularlo al mensaje de datos que se
   * hashea como evidencia legal de la licencia firmada. Si un firmante no
   * tiene snapshot (no debería ocurrir: `LegalIdentityGuard` lo exige antes
   * de firmar), se omite en vez de bloquear la evidencia del resto.
   */
  private decryptSignatoriesLegalIdentity(contract: LicenseContract): Record<string, unknown>[] {
    return contract.signatories
      .filter((signatory) => !!signatory.legalIdentitySnapshot)
      .map((signatory) => ({
        userId: signatory.user.id,
        role: signatory.role,
        signedAt: signatory.signedAt,
        legalIdentity: this.legalIdentityService.decryptSnapshot(signatory.legalIdentitySnapshot!),
      }));
  }

  /** Evidencia legal de las firmas: hash + timestamp de un snapshot con la identidad legal de cada firmante. */
  private async registerSignaturesLegalProof(contract: LicenseContract): Promise<void> {
    const snapshot = {
      event: 'license.contract.signed',
      contractId: contract.id,
      trackId: contract.requestedTrack.track.id,
      fullySignedAt: contract.fullySignedAt,
      signatories: this.decryptSignatoriesLegalIdentity(contract),
    };
    const buffer = Buffer.from(JSON.stringify(snapshot));
    const fileName = `license-contract-signatures-${contract.id}.json`;

    try {
      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: 'application/json' },
        metadataPayload: { size: buffer.length, mimeType: 'application/json', fileName },
        context: {
          entityType: LegalEntityType.CONTRACT,
          entityId: contract.id,
          requestedByUserId: contract.requestedTrack.requester.id,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo generar evidencia legal de las firmas del contrato ${contract.id}`,
        error as Error,
      );
    }
  }

  /** Inserta/actualiza identificadores externos (ISRC, UPC, …) evitando duplicados por tipo. */
  private upsertExternalIds(
    current: { type: string; value: string }[],
    entries: Record<string, string | undefined | null>,
  ): { type: string; value: string }[] {
    const result = [...current];
    for (const [type, value] of Object.entries(entries)) {
      if (!value) continue;
      const existing = result.find((entry) => entry.type === type);
      if (existing) existing.value = value;
      else result.push({ type, value });
    }
    return result;
  }

  /**
   * Vuelca los datos de la grabación al expediente del track (Dominio 3: Fonograma),
   * si el track ya tiene un expediente creado. Hace merge para no pisar los campos
   * que el compositor haya cargado previamente en el módulo de expedientes.
   */
  private async syncRecordingToRegistrationFile(trackId: string, recording: RecordingDetails): Promise<void> {
    const registrationFile = await this.registrationFileRepo.findOne({ where: { track: { id: trackId } } });
    if (!registrationFile) return;

    const existing = registrationFile.phonogramData;
    registrationFile.phonogramData = {
      hasRecording: true,
      recordingType: existing?.recordingType ?? null,
      isrc: recording.isrc,
      upc: recording.upc ?? existing?.upc ?? null,
      mainArtistName: recording.mainArtistName ?? existing?.mainArtistName ?? null,
      albumOrEpName: recording.albumOrEpName ?? existing?.albumOrEpName ?? null,
      releaseDate: recording.releaseDate ?? existing?.releaseDate ?? null,
      phonogramProducer: existing?.phonogramProducer ?? null,
      phonogramOwner: existing?.phonogramOwner ?? null,
      recordingDate: existing?.recordingDate ?? null,
    };
    await this.registrationFileRepo.save(registrationFile);
  }

  private async markExpired(contract: LicenseContract): Promise<void> {
    contract.status = LicenseContractStatus.EXPIRED;
    contract.expiredAt = new Date();
    await this.contractRepo.save(contract);

    this.eventBus.emit('license.contract.expiration.pending_confirmation', {
      contractId: contract.id,
      requestedTrackId: contract.requestedTrack.id,
      trackTitle: contract.requestedTrack.track.title,
      ownerId: contract.requestedTrack.owner.id,
      ownerEmail: contract.requestedTrack.owner.email,
      ownerName: contract.requestedTrack.owner.name,
      requesterId: contract.requestedTrack.requester.id,
      requesterEmail: contract.requestedTrack.requester.email,
      requesterName: contract.requestedTrack.requester.name,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Usado por el listener de pagos (license-collections)
  // ─────────────────────────────────────────────────────────────────────────────

  async markPaymentStatus(licenseContractId: string, paymentStatus: LicenseContractPaymentStatus): Promise<void> {
    const contract = await this.contractRepo.findOne({
      where: { id: licenseContractId },
      relations: ['requestedTrack'],
    });
    if (!contract) return;

    contract.paymentStatus = paymentStatus;
    await this.contractRepo.save(contract);

    if (paymentStatus === LicenseContractPaymentStatus.PAGADA) {
      await this.requestedTrackRepo.update(contract.requestedTrack.id, {
        status: RequestsStatus.APROBADA,
        documentUrl: contract.documentUrl,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos privados auxiliares
  // ─────────────────────────────────────────────────────────────────────────────

  private async findContractWithRelationsOrFail(id: string): Promise<LicenseContract> {
    const contract = await this.contractRepo.findOne({
      where: { id },
      relations: CONTRACT_RELATIONS,
    });
    if (!contract) throw new NotFoundException('El contrato de licencia no existe');
    return contract;
  }

  private assertCanView(contract: LicenseContract, userId: string): void {
    const isParty =
      contract.requestedTrack.owner.id === userId ||
      contract.requestedTrack.requester.id === userId ||
      (contract.signatories ?? []).some((signatory) => signatory.user.id === userId);
    if (!isParty) throw new ForbiddenException('No tienes permisos para ver este contrato');
  }

  private resolveAuthorEntries(split: Split | null, track: Track, ownerId: string): AuthorEntry[] {
    if (split && split.status === SplitStatus.COMPLETED && split.authors.length > 0) {
      // Solo coautores persona firman el contrato; la publisher coautora no firma.
      return split.authors
        .filter((author) => author.user)
        .map((author) => ({
          user: author.user,
          role: author.user.id === ownerId ? LicenseSignatoryRole.AUTOR_PRINCIPAL : LicenseSignatoryRole.COAUTOR,
          roleLabel: COAUTHOR_ROLE_LABELS[author.role] ?? author.role,
          percentage: Number(author.percentage),
          splitAuthorId: author.id,
        }));
    }

    const soleAuthor = track.authors?.find((author) => author.id === ownerId) ?? track.authors?.[0];
    if (!soleAuthor) {
      throw new BadRequestException('El track no tiene autores registrados');
    }
    return [
      {
        user: soleAuthor,
        role: LicenseSignatoryRole.AUTOR_PRINCIPAL,
        roleLabel: 'Autor único',
        percentage: 100,
        splitAuthorId: null,
      },
    ];
  }

  private buildTemplateInput(contract: LicenseContract, authorEntries: AuthorEntry[]) {
    const track = contract.requestedTrack.track;
    return {
      trackTitle: track.title,
      genreName: track.genre?.genre ?? null,
      language: track.language,
      iswc: track.iswc ?? null,
      authors: authorEntries.map((entry) => ({
        legalName: `${entry.user.name} ${entry.user.lastName}`.trim(),
        citizenId: entry.user.citizenID ?? null,
        ipiNumber: entry.user.ipiNumber ?? null,
        proSociety: entry.user.proSociety ?? null,
        publisher: entry.user.publisher ?? null,
        role: entry.roleLabel,
        percentage: entry.percentage,
      })),
      licensee: {
        legalName: `${contract.requestedTrack.requester.name} ${contract.requestedTrack.requester.lastName}`.trim(),
        citizenId: contract.requestedTrack.requester.citizenID ?? null,
        email: contract.requestedTrack.requester.email,
      },
      validityDate: contract.validityDate,
      territoryMode: contract.territoryMode,
      territoryCountries: contract.territoryCountries,
      advanceAmount: Number(contract.advanceAmount),
      advanceCurrency: contract.advanceCurrency,
      installments: (contract.advanceInstallments ?? []).map((installment) => ({
        amount: installment.amount,
        dueDate: new Date(installment.dueDate),
      })),
      commissionAmount: Number(contract.commissionAmount),
      totalPayableByLicensee: Number(contract.totalPayableByLicensee),
      royaltyPercentage: Number(contract.royaltyPercentage),
      distributionFormats: contract.distributionFormats,
      advanceDistribution: contract.advanceDistribution
        ? contract.advanceDistribution.map((entry) => ({
            authorName: this.resolveAuthorName(authorEntries, entry.userId),
            percentage: entry.percentage,
          }))
        : null,
      customInfo: contract.hasCustomInfo ? contract.customInfo : null,
      customAmount: contract.hasCustomInfo ? contract.customAmount : null,
      customCurrency: contract.hasCustomInfo ? contract.customCurrency : null,
      generatedAt: contract.generatedAt ?? new Date(),
    };
  }

  private resolveAuthorName(authorEntries: AuthorEntry[], userId: string): string {
    const entry = authorEntries.find((item) => item.user.id === userId);
    return entry ? `${entry.user.name} ${entry.user.lastName}`.trim() : 'Coautor';
  }

  private roleLabel(role: LicenseSignatoryRole): string {
    return SIGNATORY_ROLE_LABELS[role] ?? role;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /** Genera el PDF final con firmas, evidencia legal, cuotas de cobro (si aplica) y actualiza estados. */
  private async completeContract(contractId: string): Promise<void> {
    const contract = await this.findContractWithRelationsOrFail(contractId);
    const track = contract.requestedTrack.track;
    const split = await this.splitRepo.findOne({
      where: { track: { id: track.id } },
      relations: ['authors', 'authors.user'],
    });
    const authorEntries = this.resolveAuthorEntries(split, track, contract.requestedTrack.owner.id);

    const templateInput = this.buildTemplateInput(contract, authorEntries);
    const paragraphs = buildLicenseContractParagraphs({
      ...templateInput,
      signatures: contract.signatories.map((signatory) => ({
        name: `${signatory.user.name} ${signatory.user.lastName}`.trim(),
        roleLabel: this.roleLabel(signatory.role),
        signedAt: signatory.signedAt as Date,
      })),
    });

    const fileName = `licencia-primer-uso-${contract.id}.pdf`;
    const buffer = await this.pdfGeneratorService.generate({
      documentTitle: `Licencia de Primer Uso — ${track.title}`,
      body: { type: PdfBodyContentType.TEXT, paragraphs },
      metadata: { title: `Licencia de Primer Uso — ${track.title}`, author: 'Músila', generatedAt: new Date() },
    });

    const upload = await this.storageService.uploadBuffer({
      key: `license-contracts/${contract.id}/signed.pdf`,
      buffer,
      contentType: 'application/pdf',
    });

    const proof = await this.legalProofService.generateProof({
      file: { buffer, fileName, mimeType: 'application/pdf' },
      metadataPayload: { size: buffer.length, mimeType: 'application/pdf', fileName },
      context: {
        entityType: LegalEntityType.CONTRACT,
        entityId: contract.id,
        requestedByUserId: contract.requestedTrack.requester.id,
      },
    });

    contract.documentKey = upload.key;
    contract.documentUrl = upload.publicUrl;
    contract.legalProofId = proof.legalProofId;
    contract.contractHash = proof.sha256Hash;
    contract.status = LicenseContractStatus.SIGNED;
    contract.fullySignedAt = new Date();

    await this.registerSignaturesLegalProof(contract);

    if (Number(contract.advanceAmount) > 0) {
      contract.paymentStatus = LicenseContractPaymentStatus.PENDIENTE;
      await this.contractRepo.save(contract);

      // Congela (Opción A) la tarifa de comisión de publisher usando la
      // distribución del anticipo del contrato, antes de generar las cuotas.
      await this.publisherCommissionFreezeService.freeze(contract.requestedTrack, {
        licenseContractId: contract.id,
      });
      await this.requestedTrackRepo.update(contract.requestedTrack.id, {
        publisherCommissionSnapshot: contract.requestedTrack.publisherCommissionSnapshot,
        publisherCommissionFrozenAt: contract.requestedTrack.publisherCommissionFrozenAt,
      });

      const installments = (contract.advanceInstallments ?? []).map((installment) => ({
        amount: installment.amount,
        dueDate: new Date(installment.dueDate),
      }));
      await this.licenseCollectionsService.createInstallments(
        contract.requestedTrack.id,
        contract.id,
        installments,
      );

      // Notifica a cada participante del Split para que configure su
      // información bancaria de cobro (no bloquea la venta: el contrato ya
      // quedó firmado y las cuotas ya se generaron).
      this.eventBus.emit('wallet.bank_information.requested', {
        contractId: contract.id,
        requestedTrackId: contract.requestedTrack.id,
        trackTitle: track.title,
        advanceAmount: Number(contract.advanceAmount),
        participants: authorEntries.map((entry) => ({
          userId: entry.user.id,
          name: `${entry.user.name} ${entry.user.lastName}`.trim(),
          email: entry.user.email,
        })),
      });
    } else {
      contract.paymentStatus = LicenseContractPaymentStatus.APROBADA;
      await this.contractRepo.save(contract);
      await this.requestedTrackRepo.update(contract.requestedTrack.id, {
        status: RequestsStatus.APROBADA,
        documentUrl: contract.documentUrl,
      });
    }

    const uniqueParties = new Map<string, User>();
    uniqueParties.set(contract.requestedTrack.owner.id, contract.requestedTrack.owner);
    for (const entry of authorEntries) uniqueParties.set(entry.user.id, entry.user);
    uniqueParties.set(contract.requestedTrack.requester.id, contract.requestedTrack.requester);

    this.eventBus.emit('license.contract.signed', {
      contractId: contract.id,
      requestedTrackId: contract.requestedTrack.id,
      trackTitle: track.title,
      documentUrl: contract.documentUrl,
      parties: Array.from(uniqueParties.values()).map((user) => ({
        userId: user.id,
        name: `${user.name} ${user.lastName}`.trim(),
        email: user.email,
      })),
    });
  }
}
