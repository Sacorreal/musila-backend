import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { isAdminPlanType } from 'src/users/entities/user-plan-type.enum';
import { User } from 'src/users/entities/user.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { OtpVerificationService } from 'src/shared/otp-verification/otp-verification.service';
import { OtpPurpose } from 'src/shared/otp-verification/otp-purpose.enum';

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
    this.assertOwnership(track, user);

    const existingSplit = await this.splitRepository.findOne({ where: { track: { id: trackId } } });
    if (existingSplit) {
      throw new ConflictException('Este track ya tiene un split registrado');
    }

    this.assertPercentagesSumToHundred(dto.authors);
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
    const result = await this.findSplitWithRelationsOrFail(saved.id);

    this.emitSplitCreated(result, track, user, authorsById);

    return result;
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

    this.assertCanView(track, split, user);

    return split;
  }

  /**
   * Edita un split rechazado (bloqueado): reemplaza coautores/porcentajes/roles,
   * reinicia todos los estados de aprobación a pendiente y reenvía notificaciones.
   */
  async updateSplit(splitId: string, dto: UpdateSplitDto, user: JwtPayload): Promise<Split> {
    const split = await this.findSplitWithRelationsOrFail(splitId);
    this.assertOwnership(split.track, user);

    if (split.status !== SplitStatus.BLOCKED) {
      throw new BadRequestException('Solo se puede editar un split que fue rechazado por un coautor');
    }

    this.assertPercentagesSumToHundred(dto.authors);
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

    const result = await this.findSplitWithRelationsOrFail(splitId);
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

    return this.findSplitWithRelationsOrFail(splitId);
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

    return this.findSplitWithRelationsOrFail(splitId);
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

  /** Verifica que el usuario autenticado sea autor del track (o admin del sistema). */
  private assertOwnership(track: Track, user: JwtPayload): void {
    const isAuthor = track.authors?.some((author) => author.id === user.id);
    if (!isAuthor && !isAdminPlanType(user.planType)) {
      throw new ForbiddenException('No tienes permisos para gestionar el split de este track');
    }
  }

  /** El track owner/admin y cualquier coautor listado pueden ver el split. */
  private assertCanView(track: Track, split: Split, user: JwtPayload): void {
    const isTrackAuthor = track.authors?.some((author) => author.id === user.id);
    const isSplitCoauthor = split.authors?.some((author) => author.user?.id === user.id);
    if (!isTrackAuthor && !isSplitCoauthor && !isAdminPlanType(user.planType)) {
      throw new ForbiddenException('No tienes permisos para ver este split');
    }
  }

  private assertIsPendingCoauthor(split: Split, userId: string): SplitAuthor {
    const splitAuthor = split.authors.find((author) => author.user.id === userId);
    if (!splitAuthor) {
      throw new ForbiddenException('No formas parte de este split');
    }
    if (splitAuthor.status !== SplitAuthorStatus.PENDING) {
      throw new ConflictException('Tu participación en este split ya fue procesada');
    }
    return splitAuthor;
  }

  private assertPercentagesSumToHundred(authors: SplitAuthorInputDto[]): void {
    const sum = authors.reduce((acc, author) => acc + author.percentage, 0);
    if (Math.round(sum * 100) / 100 !== PERCENTAGE_TOTAL) {
      throw new BadRequestException('La suma de los porcentajes de los coautores debe ser exactamente 100');
    }
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
      authors: split.authors.map((author) => {
        const authorUser = authorsById.get(author.user.id) ?? author.user;
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
    const intellectualProperty = this.intellectualPropertyRepository.create({
      type: 'splitSheet',
      key: 'Split de coautoría',
      track: split.track,
      metadata: {
        splitId: split.id,
        completedAt: new Date().toISOString(),
        authors: split.authors.map((author) => ({
          userId: author.user.id,
          percentage: Number(author.percentage),
          role: author.role,
          signedAt: author.signedAt,
        })),
      },
    });
    const savedIp = await this.intellectualPropertyRepository.save(intellectualProperty);

    split.status = SplitStatus.COMPLETED;
    split.intellectualProperty = savedIp;
    await this.splitRepository.save(split);

    this.eventBus.emit('split.completed', {
      splitId: split.id,
      trackId: split.track.id,
      trackTitle: split.track.title,
      createdByUserId: split.createdBy.id,
      createdByName: split.createdBy.name,
      createdByEmail: split.createdBy.email,
    });
  }
}
