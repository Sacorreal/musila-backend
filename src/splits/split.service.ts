import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorizationService } from 'src/authorization/authorization.service';
import { User } from 'src/users/entities/user.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { PublisherShareService } from 'src/publisher-share/publisher-share.service';
import { ResolvedPublisherShare } from 'src/publisher-share/publisher-share.types';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { OtpVerificationService } from 'src/shared/otp-verification/otp-verification.service';
import { OtpPurpose } from 'src/shared/otp-verification/otp-purpose.enum';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';

import { Split } from './entities/split.entity';
import { SplitAuthor } from './entities/split-author.entity';
import { SplitStatus } from './entities/split-status.enum';
import { SplitAuthorStatus } from './entities/split-author-status.enum';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { RejectSplitDto } from './dto/reject-split.dto';
import { SplitAuthorInputDto } from './dto/split-author-input.dto';

const PERCENTAGE_TOTAL = 100;

@Injectable()
export class SplitService {
  private readonly logger = new Logger(SplitService.name);

  constructor(
    @InjectRepository(Split)
    private readonly splitRepository: Repository<Split>,
    @InjectRepository(SplitAuthor)
    private readonly splitAuthorRepository: Repository<SplitAuthor>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(IntellectualProperty)
    private readonly intellectualPropertyRepository: Repository<IntellectualProperty>,
    private readonly eventBus: EventBusService,
    private readonly otpVerificationService: OtpVerificationService,
    private readonly legalProofService: LegalProofService,
    private readonly authorizationService: AuthorizationService,
    private readonly publisherShareService: PublisherShareService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos públicos
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea el split coautoral de un track.
   *
   * Validaciones: el usuario es autor del track (o admin), no existe ya un split
   * para ese track, la suma de porcentajes es exactamente 100, y cada coautor
   * existe en el sistema.
   */
  async createSplit(trackId: string, dto: CreateSplitDto, user: JwtPayload): Promise<Split> {
    const track = await this.findTrackOrFail(trackId);
    await this.assertOwnership(track, user);

    const existingSplit = await this.splitRepository.findOne({ where: { track: { id: trackId } } });
    if (existingSplit) {
      throw new ConflictException('Este track ya tiene un split registrado');
    }

    this.assertHumanPercentages(dto.authors);
    const authorsById = await this.resolveAuthorsOrFail(dto.authors);

    const split = this.splitRepository.create({
      track,
      createdBy: { id: user.id } as User,
      status: SplitStatus.PENDING_APPROVAL,
      authors: dto.authors.map((input) =>
        this.splitAuthorRepository.create({
          user: authorsById.get(input.userId),
          percentage: input.percentage,
          role: input.role,
          status: SplitAuthorStatus.PENDING,
        }),
      ),
    });

    const saved = await this.splitRepository.save(split);
    const result = await this.withPublisherShares(await this.findSplitWithRelationsOrFail(saved.id));

    this.emitSplitCreated(result, track, user, authorsById);

    return result;
  }

  /** Indica si el track tiene un split firmado por todos sus coautores (1 o N). Usado como gate de publicación. */
  async isSplitCompletedForTrack(trackId: string): Promise<boolean> {
    const split = await this.splitRepository.findOne({ where: { track: { id: trackId } } });
    return split?.status === SplitStatus.COMPLETED;
  }

  /** Obtiene el split de un track junto con el estado de aprobación de cada coautor. */
  async getSplitByTrack(trackId: string, user: JwtPayload): Promise<Split> {
    const track = await this.findTrackOrFail(trackId);

    const split = await this.splitRepository.findOne({
      where: { track: { id: trackId } },
      relations: ['track', 'createdBy', 'authors', 'authors.user'],
    });
    if (!split) {
      throw new NotFoundException('No hay un split registrado para este track');
    }

    await this.assertCanView(track, split, user);

    return this.withPublisherShares(split);
  }

  /**
   * Edita un split rechazado (bloqueado): reemplaza coautores/porcentajes/roles,
   * reinicia todos los estados de aprobación a pendiente y reenvía notificaciones.
   */
  async updateSplit(splitId: string, dto: UpdateSplitDto, user: JwtPayload): Promise<Split> {
    const split = await this.findSplitWithRelationsOrFail(splitId);
    await this.assertOwnership(split.track, user);

    if (split.status !== SplitStatus.BLOCKED) {
      throw new BadRequestException('Solo se puede editar un split que fue rechazado por un coautor');
    }

    this.assertHumanPercentages(dto.authors);
    const authorsById = await this.resolveAuthorsOrFail(dto.authors);

    await this.splitAuthorRepository.remove(split.authors);

    split.authors = dto.authors.map((input) =>
      this.splitAuthorRepository.create({
        split,
        user: authorsById.get(input.userId),
        percentage: input.percentage,
        role: input.role,
        status: SplitAuthorStatus.PENDING,
      }),
    );
    split.status = SplitStatus.PENDING_APPROVAL;

    await this.splitAuthorRepository.save(split.authors);
    await this.splitRepository.save(split);

    const result = await this.withPublisherShares(await this.findSplitWithRelationsOrFail(splitId));
    this.emitSplitCreated(result, split.track, user, authorsById);

    return result;
  }

  /**
   * Aprueba la participación del coautor autenticado. Exige verificación OTP
   * previa (purpose SPLIT_SIGNING). Si todos los coautores quedan aprobados,
   * completa el split y genera el registro de propiedad intelectual asociado.
   */
  async approveSplitAuthor(splitId: string, user: JwtPayload): Promise<Split> {
    const split = await this.findSplitWithRelationsOrFail(splitId);
    const splitAuthor = this.assertIsPendingCoauthor(split, user.id);

    await this.otpVerificationService.assertAndConsumeVerification(user.id, OtpPurpose.SPLIT_SIGNING, splitId);

    splitAuthor.status = SplitAuthorStatus.APPROVED;
    splitAuthor.signedAt = new Date();
    await this.splitAuthorRepository.save(splitAuthor);

    const allApproved = split.authors.every(
      (author) => author.id === splitAuthor.id || author.status === SplitAuthorStatus.APPROVED,
    );

    if (allApproved) {
      await this.completeSplit(split);
    }

    return this.withPublisherShares(await this.findSplitWithRelationsOrFail(splitId));
  }

  /** Rechaza la participación del coautor autenticado, con motivo obligatorio. */
  async rejectSplitAuthor(splitId: string, dto: RejectSplitDto, user: JwtPayload): Promise<Split> {
    const split = await this.findSplitWithRelationsOrFail(splitId);
    const splitAuthor = this.assertIsPendingCoauthor(split, user.id);

    splitAuthor.status = SplitAuthorStatus.REJECTED;
    splitAuthor.rejectionReason = dto.reason;
    await this.splitAuthorRepository.save(splitAuthor);

    split.status = SplitStatus.BLOCKED;
    await this.splitRepository.save(split);

    this.eventBus.emit('split.author.rejected', {
      splitId: split.id,
      trackId: split.track.id,
      trackTitle: split.track.title,
      authorUserId: user.id,
      authorName: user.name,
      reason: dto.reason,
      createdByUserId: split.createdBy.id,
      createdByName: split.createdBy.name,
      createdByEmail: split.createdBy.email,
    });

    return this.withPublisherShares(await this.findSplitWithRelationsOrFail(splitId));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos privados auxiliares
  // ─────────────────────────────────────────────────────────────────────────────

  private async findTrackOrFail(trackId: string): Promise<Track> {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
      relations: ['authors'],
    });
    if (!track) throw new NotFoundException('El track no existe');
    return track;
  }

  private async findSplitWithRelationsOrFail(id: string): Promise<Split> {
    const split = await this.splitRepository.findOne({
      where: { id },
      relations: ['track', 'track.authors', 'createdBy', 'authors', 'authors.user'],
    });
    if (!split) throw new NotFoundException('El split no existe');
    return split;
  }

  /** Verifica que el usuario sea autor del track (o staff con gestión de splits). */
  private async assertOwnership(track: Track, user: JwtPayload): Promise<void> {
    const isAuthor = track.authors?.some((author) => author.id === user.id);
    if (isAuthor) return;

    const decision = await this.authorizationService.check(
      { userId: user.id },
      { caps: ['platform.billing.splits.manage'], operator: 'AND' },
    );
    if (!decision.allowed) {
      throw new ForbiddenException('No tienes permisos para gestionar el split de este track');
    }
  }

  /** El autor del track, cualquier coautor listado o el staff con gestión de splits pueden ver el split. */
  private async assertCanView(track: Track, split: Split, user: JwtPayload): Promise<void> {
    const isTrackAuthor = track.authors?.some((author) => author.id === user.id);
    const isSplitCoauthor = split.authors?.some((author) => author.user?.id === user.id);
    if (isTrackAuthor || isSplitCoauthor) return;

    const decision = await this.authorizationService.check(
      { userId: user.id },
      { caps: ['platform.billing.splits.manage'], operator: 'AND' },
    );
    if (!decision.allowed) {
      throw new ForbiddenException('No tienes permisos para ver este split');
    }
  }

  private assertIsPendingCoauthor(split: Split, userId: string): SplitAuthor {
    const splitAuthor = split.authors.find((author) => author.user?.id === userId);
    if (!splitAuthor) {
      throw new ForbiddenException('No formas parte de este split');
    }
    if (splitAuthor.status !== SplitAuthorStatus.PENDING) {
      throw new ConflictException('Tu participación en este split ya fue procesada');
    }
    return splitAuthor;
  }

  /**
   * Publisher's Share informativo del creador del split: metadata para el
   * expediente del track (notificación a entidades externas). Es independiente
   * del 100% de los coautores humanos y no interviene en ningún cálculo.
   */
  private resolvePublisherShares(creatorUserId: string): Promise<ResolvedPublisherShare[]> {
    return this.publisherShareService.resolveForUser(creatorUserId);
  }

  /** Adjunta el Publisher's Share (transient) a la respuesta del split, resuelto para su creador. */
  private async withPublisherShares(split: Split): Promise<Split> {
    split.publisherShares = await this.resolvePublisherShares(split.createdBy.id);
    return split;
  }

  /** Los coautores humanos siempre reparten el 100%; el % de la publisher coautora es informativo y no consume porcentaje. */
  private assertHumanPercentages(authors: SplitAuthorInputDto[]): void {
    if (this.round(this.sumPercentages(authors)) === PERCENTAGE_TOTAL) return;
    throw new BadRequestException('La suma de los porcentajes de los coautores debe ser exactamente 100');
  }

  /** Snapshot de coautores persona (con su firma) para la propiedad intelectual y la evidencia legal. */
  private buildAuthorsSnapshot(split: Split): Record<string, unknown>[] {
    return split.authors.map((author) => ({
      userId: author.user.id,
      signedAt: author.signedAt,
      percentage: Number(author.percentage),
      role: author.role,
    }));
  }

  /** Snapshot del Publisher's Share (metadata informativa) para el expediente del track. */
  private buildPublisherSharesSnapshot(shares: ResolvedPublisherShare[]): Record<string, unknown>[] {
    return shares.map((share) => ({
      organizationId: share.organizationId,
      organizationName: share.organizationName,
      percentage: share.percentage,
    }));
  }

  private sumPercentages(items: { percentage: number }[]): number {
    return items.reduce((acc, item) => acc + Number(item.percentage), 0);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private async resolveAuthorsOrFail(authors: SplitAuthorInputDto[]): Promise<Map<string, User>> {
    const userIds = authors.map((author) => author.userId);
    const users = await this.userRepository.find({ where: { id: In(userIds) } });

    const usersById = new Map(users.map((u) => [u.id, u]));
    const missingId = userIds.find((id) => !usersById.has(id));
    if (missingId) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usersById;
  }

  private emitSplitCreated(
    split: Split,
    track: Track,
    user: JwtPayload,
    authorsById: Map<string, User>,
  ): void {
    this.eventBus.emit('split.created', {
      splitId: split.id,
      trackId: track.id,
      trackTitle: track.title,
      createdByUserId: user.id,
      createdByName: user.name,
      authors: split.authors
        .filter((author) => author.user)
        .map((author) => {
          const authorUser = authorsById.get(author.user!.id) ?? author.user!;
          return {
            userId: authorUser.id,
            name: `${authorUser.name} ${authorUser.lastName}`.trim(),
            email: authorUser.email,
            percentage: Number(author.percentage),
            role: author.role,
          };
        }),
    });
  }

  private async completeSplit(split: Split): Promise<void> {
    const publisherShares = await this.resolvePublisherShares(split.createdBy.id);

    const intellectualProperty = this.intellectualPropertyRepository.create({
      type: 'splitSheet',
      key: 'Split de coautoría',
      track: split.track,
      metadata: {
        splitId: split.id,
        completedAt: new Date().toISOString(),
        authors: this.buildAuthorsSnapshot(split),
        publisherShares: this.buildPublisherSharesSnapshot(publisherShares),
      },
    });
    const savedIp = await this.intellectualPropertyRepository.save(intellectualProperty);

    split.status = SplitStatus.COMPLETED;
    split.intellectualProperty = savedIp;
    await this.splitRepository.save(split);

    // La firma de todos los coautores es, por definición, la aprobación para publicar:
    // el track pasa a disponible automáticamente en cuanto el split queda completo.
    split.track.isAvailable = true;
    await this.trackRepository.save(split.track);

    await this.generateSplitLegalProof(split, publisherShares);

    this.eventBus.emit('split.completed', {
      splitId: split.id,
      trackId: split.track.id,
      trackTitle: split.track.title,
      createdByUserId: split.createdBy.id,
      createdByName: split.createdBy.name,
      createdByEmail: split.createdBy.email,
      authors: split.authors
        .filter((author) => author.user)
        .map((author) => ({
          userId: author.user!.id,
          name: `${author.user!.name} ${author.user!.lastName}`.trim(),
          email: author.user!.email,
        })),
    });
  }

  /** Evidencia legal del split completado: hash + timestamp de un snapshot de autores/porcentajes/firmas + Publisher's Share. */
  private async generateSplitLegalProof(split: Split, publisherShares: ResolvedPublisherShare[]): Promise<void> {
    const snapshot = {
      event: 'split.completed',
      splitId: split.id,
      trackId: split.track.id,
      completedAt: new Date().toISOString(),
      authors: this.buildAuthorsSnapshot(split),
      publisherShares: this.buildPublisherSharesSnapshot(publisherShares),
    };
    const buffer = Buffer.from(JSON.stringify(snapshot));
    const fileName = `split-${split.id}.json`;

    try {
      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: 'application/json' },
        metadataPayload: { size: buffer.length, mimeType: 'application/json', fileName },
        context: {
          entityType: LegalEntityType.CO_AUTHORSHIP,
          entityId: split.id,
          requestedByUserId: split.createdBy.id,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo generar evidencia legal para el split ${split.id}`, error as Error);
    }
  }
}
