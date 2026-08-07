import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { isAdminPlanType } from 'src/users/entities/user-plan-type.enum';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { PublishingContract } from 'src/publishing-contracts/entities/publishing-contract.entity';
import { Split } from 'src/splits/entities/split.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { StorageService } from 'src/shared/storage/storage.service';

import { RegistrationFile } from './entities/registration-file.entity';
import { RegistrationFileStatus } from './entities/registration-file-status.enum';
import { RegistrationFileParticipant } from './entities/registration-file-participant.entity';
import { RegistrationNumberService } from './registration-number.service';
import { CreateRegistrationFileDto } from './dto/create-registration-file.dto';
import { UpdateGeneralInfoDto } from './dto/update-general-info.dto';
import { UpdateParticipantsDto } from './dto/update-participants.dto';
import { UpdatePhonogramDto } from './dto/update-phonogram.dto';
import { UpdatePublishingDto } from './dto/update-publishing.dto';
import { UpdateDerivativeWorkDto } from './dto/update-derivative-work.dto';
import { UpdateCommissionedWorkDto } from './dto/update-commissioned-work.dto';
import { UpdateAiUsageDto } from './dto/update-ai-usage.dto';
import { mapCoauthorRoleToParticipantRole } from './utils/coauthor-role-mapper.util';

export interface RegistrationFileSummary {
  id: string;
  caseNumber: string;
  status: RegistrationFileStatus;
}

@Injectable()
export class RegistrationFileService {
  constructor(
    @InjectRepository(RegistrationFile)
    private readonly registrationFileRepository: Repository<RegistrationFile>,
    @InjectRepository(RegistrationFileParticipant)
    private readonly participantRepository: Repository<RegistrationFileParticipant>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(PublishingContract)
    private readonly publishingContractRepository: Repository<PublishingContract>,
    @InjectRepository(Split)
    private readonly splitRepository: Repository<Split>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly registrationNumberService: RegistrationNumberService,
    private readonly eventBus: EventBusService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Crea el expediente 1:1 de un track, autocompletando Información General
   * desde el `Track` (título, idioma, género, ritmo). El número de expediente
   * se genera dentro de la misma transacción que el insert para que un
   * rollback no deje huecos de secuencia innecesarios.
   */
  async createForTrack(trackId: string, dto: CreateRegistrationFileDto, user: JwtPayload): Promise<RegistrationFile> {
    const track = await this.findTrackOrFail(trackId);
    this.assertOwnership(track, user);

    const existing = await this.registrationFileRepository.findOne({ where: { track: { id: trackId } } });
    if (existing) {
      throw new ConflictException('Este track ya tiene un expediente de registro');
    }

    return this.dataSource.transaction(async (manager) => {
      const caseNumber = await this.registrationNumberService.generateCaseNumber(manager);
      const internalCode = caseNumber.replace(/^EXP-/, '');

      const registrationFile = manager.create(RegistrationFile, {
        caseNumber,
        internalCode,
        track,
        createdBy: { id: user.id } as User,
        status: RegistrationFileStatus.EN_CONSTRUCCION,
        activeProfileKeys: dto.activeProfileKeys,
        title: track.title,
        alternativeTitles: [],
        language: track.language,
        genre: track.genre?.genre ?? '—',
        ritmo: track.ritmo ?? null,
      });

      return manager.save(RegistrationFile, registrationFile);
    }).then((saved) => {
      this.eventBus.emit('registration-file.created', {
        registrationFileId: saved.id,
        trackId: track.id,
        caseNumber: saved.caseNumber,
        createdByUserId: user.id,
        activeProfileKeys: saved.activeProfileKeys,
      });
      return saved;
    });
  }

  async findByTrack(trackId: string, user: JwtPayload): Promise<RegistrationFile> {
    const track = await this.findTrackOrFail(trackId);
    this.assertOwnership(track, user);

    const registrationFile = await this.registrationFileRepository.findOne({
      where: { track: { id: trackId } },
      relations: this.defaultRelations(),
    });
    if (!registrationFile) {
      throw new NotFoundException('Este track no tiene un expediente de registro');
    }
    return registrationFile;
  }

  /**
   * Batch liviano para listados como "Mis canciones" — evita N+1 requests de
   * estado por fila. Mismo criterio que `CertificatesService.getStatusesForTracks`.
   */
  async getSummariesForTracks(trackIds: string[]): Promise<Map<string, RegistrationFileSummary>> {
    if (!trackIds.length) return new Map();

    const registrationFiles = await this.registrationFileRepository.find({
      where: { track: { id: In(trackIds) } },
      relations: ['track'],
    });

    return new Map(
      registrationFiles.map((rf) => [
        rf.track.id,
        { id: rf.id, caseNumber: rf.caseNumber, status: rf.status },
      ]),
    );
  }

  async findOne(id: string, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findWithRelationsOrFail(id);
    this.assertOwnership(registrationFile.track, user);
    return registrationFile;
  }

  async updateGeneralInfo(id: string, dto: UpdateGeneralInfoDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    if (dto.title !== undefined) registrationFile.title = dto.title;
    if (dto.alternativeTitles !== undefined) registrationFile.alternativeTitles = dto.alternativeTitles;
    if (dto.language !== undefined) registrationFile.language = dto.language;
    if (dto.ritmo !== undefined) registrationFile.ritmo = dto.ritmo;
    if (dto.durationSeconds !== undefined) registrationFile.durationSeconds = dto.durationSeconds;
    if (dto.creationDate !== undefined) registrationFile.creationDate = dto.creationDate;
    if (dto.creationPlace !== undefined) registrationFile.creationPlace = dto.creationPlace;
    if (dto.workState !== undefined) registrationFile.workState = dto.workState;
    if (dto.version !== undefined) registrationFile.version = dto.version;
    if (dto.description !== undefined) registrationFile.description = dto.description;

    return this.registrationFileRepository.save(registrationFile);
  }

  /** Reemplaza la lista completa de participantes (mismo criterio "replace all" que `SplitService.updateSplit`). */
  async updateParticipants(id: string, dto: UpdateParticipantsDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    await this.participantRepository.delete({ registrationFile: { id: registrationFile.id } });

    registrationFile.participants = dto.participants.map((input) =>
      this.participantRepository.create({
        registrationFile,
        splitAuthor: input.splitAuthorId ? ({ id: input.splitAuthorId } as RegistrationFileParticipant['splitAuthor']) : null,
        fullName: input.fullName,
        documentType: input.documentType ?? null,
        documentNumber: input.documentNumber ?? null,
        nationality: input.nationality ?? null,
        managementSociety: input.managementSociety ?? null,
        ipiCode: input.ipiCode ?? null,
        saycoCode: input.saycoCode ?? null,
        saycoIpName: input.saycoIpName ?? null,
        role: input.role,
        authorialPercentage: input.authorialPercentage,
        mechanicalPercentage: input.mechanicalPercentage,
      }),
    );

    await this.participantRepository.save(registrationFile.participants);
    return this.findWithRelationsOrFail(id);
  }

  /**
   * Reemplaza la lista de participantes autocompletándola desde el `Split`
   * de coautoría existente del track — "Capturar la mayor cantidad de
   * metadatos de forma automática" (objetivo final del requerimiento). El
   * split no distingue %PER de %MEC (un solo `percentage`), así que ambos se
   * inicializan con el mismo valor; el usuario los ajusta en el wizard si
   * su reparto real difiere entre ejecución pública y mecánicos.
   */
  async populateParticipantsFromSplit(id: string, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    const split = await this.splitRepository.findOne({
      where: { track: { id: registrationFile.track.id } },
      relations: ['authors', 'authors.user'],
    });
    if (!split) {
      throw new NotFoundException('Este track no tiene un split de coautoría registrado');
    }

    await this.participantRepository.delete({ registrationFile: { id: registrationFile.id } });

    registrationFile.participants = split.authors.map((splitAuthor) =>
      this.participantRepository.create({
        registrationFile,
        splitAuthor,
        fullName: [splitAuthor.user.name, splitAuthor.user.lastName].filter(Boolean).join(' '),
        documentType: splitAuthor.user.typeCitizenID ?? null,
        documentNumber: splitAuthor.user.citizenID ?? null,
        nationality: null,
        managementSociety: splitAuthor.user.proSociety ?? null,
        ipiCode: splitAuthor.user.ipiNumber ?? null,
        saycoCode: null,
        saycoIpName: null,
        role: mapCoauthorRoleToParticipantRole(splitAuthor.role),
        authorialPercentage: splitAuthor.percentage,
        mechanicalPercentage: splitAuthor.percentage,
      }),
    );

    await this.participantRepository.save(registrationFile.participants);
    return this.findWithRelationsOrFail(id);
  }

  async updatePhonogram(id: string, dto: UpdatePhonogramDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    registrationFile.phonogramData = {
      hasRecording: dto.hasRecording,
      recordingType: dto.recordingType ?? null,
      isrc: dto.isrc ?? null,
      phonogramProducer: dto.phonogramProducer ?? null,
      phonogramOwner: dto.phonogramOwner ?? null,
      recordingDate: dto.recordingDate ?? null,
    };

    return this.registrationFileRepository.save(registrationFile);
  }

  async updatePublishing(id: string, dto: UpdatePublishingDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    registrationFile.hasPublishingDeal = dto.hasPublishingDeal;
    registrationFile.publishingAdministeredPercentage = dto.publishingAdministeredPercentage ?? null;

    if (dto.hasPublishingDeal && dto.publishingContractId) {
      const contract = await this.publishingContractRepository.findOne({
        where: { id: dto.publishingContractId },
        relations: ['owner'],
      });
      if (!contract) throw new NotFoundException('El contrato editorial seleccionado no existe');
      if (contract.owner.id !== registrationFile.createdBy.id && !isAdminPlanType(user.planType)) {
        throw new ForbiddenException('El contrato editorial seleccionado no te pertenece');
      }
      registrationFile.publishingContract = contract;
    } else {
      registrationFile.publishingContract = null;
    }

    return this.registrationFileRepository.save(registrationFile);
  }

  async updateDerivativeWork(id: string, dto: UpdateDerivativeWorkDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    registrationFile.derivativeWorkData = {
      isDerivative: dto.isDerivative,
      originalWorkOrigin: dto.originalWorkOrigin ?? null,
      iswc: dto.iswc ?? null,
      preexistingWorkName: dto.preexistingWorkName ?? null,
      adaptationType: dto.adaptationType ?? null,
    };

    return this.registrationFileRepository.save(registrationFile);
  }

  async updateCommissionedWork(id: string, dto: UpdateCommissionedWorkDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    registrationFile.commissionedWorkData = {
      isCommissioned: dto.isCommissioned,
      contractingCompany: dto.contractingCompany ?? null,
      observations: dto.observations ?? null,
    };

    return this.registrationFileRepository.save(registrationFile);
  }

  async updateAiUsage(id: string, dto: UpdateAiUsageDto, user: JwtPayload): Promise<RegistrationFile> {
    const registrationFile = await this.findOne(id, user);

    registrationFile.aiUsageData = {
      usedAi: dto.usedAi,
      toolUsed: dto.toolUsed ?? null,
      participationLevel: dto.participationLevel ?? null,
      observations: dto.observations ?? null,
    };

    return this.registrationFileRepository.save(registrationFile);
  }

  async downloadPdf(id: string, user: JwtPayload): Promise<{ buffer: Buffer; filename: string }> {
    const registrationFile = await this.findOne(id, user);
    if (!registrationFile.generatedPdfKey) {
      throw new NotFoundException('El PDF del expediente aún no ha sido generado');
    }
    const buffer = await this.storageService.downloadObject(registrationFile.generatedPdfKey);
    return { buffer, filename: `expediente-${registrationFile.caseNumber}.pdf` };
  }

  async downloadZip(id: string, user: JwtPayload): Promise<{ buffer: Buffer; filename: string }> {
    const registrationFile = await this.findOne(id, user);
    if (!registrationFile.generatedZipKey) {
      throw new NotFoundException('El ZIP del expediente aún no ha sido generado');
    }
    const buffer = await this.storageService.downloadObject(registrationFile.generatedZipKey);
    return { buffer, filename: `expediente-${registrationFile.caseNumber}.zip` };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────────────────────────────────────

  private defaultRelations(): string[] {
    return ['track', 'createdBy', 'participants', 'documents', 'profileStatuses', 'publishingContract'];
  }

  private async findTrackOrFail(trackId: string): Promise<Track> {
    const track = await this.trackRepository.findOne({ where: { id: trackId }, relations: ['authors', 'genre'] });
    if (!track) throw new NotFoundException('El track no existe');
    return track;
  }

  private async findWithRelationsOrFail(id: string): Promise<RegistrationFile> {
    const registrationFile = await this.registrationFileRepository.findOne({
      where: { id },
      relations: [...this.defaultRelations(), 'track.authors'],
    });
    if (!registrationFile) throw new NotFoundException('El expediente de registro no existe');
    return registrationFile;
  }

  private assertOwnership(track: Track, user: JwtPayload): void {
    const isAuthor = track.authors?.some((author) => author.id === user.id);
    if (!isAuthor && !isAdminPlanType(user.planType)) {
      throw new ForbiddenException('No tienes permisos para gestionar el expediente de este track');
    }
  }
}
