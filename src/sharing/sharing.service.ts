import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { In, IsNull, Repository } from 'typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AccessLogPaginationDto } from './dto/access-log-pagination.dto';
import { AuthorizeRecipientDto } from './dto/authorize-recipient.dto';
import { AuthorizedRecipientResponseDto } from './dto/authorized-recipient-response.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ShareLinkResponseDto } from './dto/share-link-response.dto';
import { ValidateAccessResponseDto } from './dto/validate-access-response.dto';
import { ShareAccessReason } from './entities/share-access-reason.enum';
import { ShareAccessLog } from './entities/share-access-log.entity';
import { ShareAuthorizedRecipient } from './entities/share-authorized-recipient.entity';
import { ShareLink } from './entities/share-link.entity';
import { ShareResourceType } from './entities/share-resource-type.enum';

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(ShareLink)
    private readonly shareLinkRepository: Repository<ShareLink>,
    @InjectRepository(ShareAuthorizedRecipient)
    private readonly recipientRepository: Repository<ShareAuthorizedRecipient>,
    @InjectRepository(ShareAccessLog)
    private readonly accessLogRepository: Repository<ShareAccessLog>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Creación y gestión de enlaces
  // ─────────────────────────────────────────────────────────────────────────────

  async createProfileShareLink(ownerId: string, dto: CreateShareLinkDto): Promise<ShareLinkResponseDto> {
    const owner = await this.findUserOrFail(ownerId);
    const shareLink = await this.findOrCreateShareLink(owner, ShareResourceType.PROFILE, owner.id, dto);
    return this.toShareLinkResponseDto(shareLink);
  }

  async createPlaylistShareLink(
    ownerId: string,
    playlistId: string,
    dto: CreateShareLinkDto,
  ): Promise<ShareLinkResponseDto> {
    const owner = await this.findUserOrFail(ownerId);
    const shareLink = await this.findOrCreateShareLink(owner, ShareResourceType.PLAYLIST, playlistId, dto);
    return this.toShareLinkResponseDto(shareLink);
  }

  async createTrackShareLink(
    ownerId: string,
    trackId: string,
    dto: CreateShareLinkDto,
  ): Promise<ShareLinkResponseDto> {
    const owner = await this.findUserOrFail(ownerId);
    const shareLink = await this.findOrCreateShareLink(owner, ShareResourceType.TRACK, trackId, dto);
    return this.toShareLinkResponseDto(shareLink);
  }

  async listMyShareLinks(ownerId: string): Promise<ShareLinkResponseDto[]> {
    const links = await this.shareLinkRepository.find({
      where: { owner: { id: ownerId } },
      order: { createdAt: 'DESC' },
    });
    return links.map((link) => this.toShareLinkResponseDto(link));
  }

  async revokeShareLink(shareLinkId: string): Promise<{ message: string }> {
    const shareLink = await this.findShareLinkOrFail(shareLinkId);
    shareLink.revokedAt = new Date();
    await this.shareLinkRepository.save(shareLink);
    return { message: 'Enlace revocado exitosamente' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Destinatarios autorizados
  // ─────────────────────────────────────────────────────────────────────────────

  async authorizeRecipient(
    shareLinkId: string,
    dto: AuthorizeRecipientDto,
    grantedBy: JwtPayload,
  ): Promise<AuthorizedRecipientResponseDto> {
    const shareLink = await this.findShareLinkOrFail(shareLinkId);

    if (shareLink.resourceType === ShareResourceType.PROFILE) {
      throw new ConflictException('El enlace de perfil no requiere autorización por username');
    }

    const recipientUser = await this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', { username: dto.username })
      .getOne();
    if (!recipientUser) {
      throw new NotFoundException('No existe ningún usuario con ese nombre de usuario');
    }

    const granter = await this.findUserOrFail(grantedBy.id);

    let recipient = await this.recipientRepository.findOne({
      where: { shareLink: { id: shareLinkId }, recipientUser: { id: recipientUser.id } },
      relations: ['recipientUser'],
    });

    if (recipient && !recipient.revokedAt) {
      throw new ConflictException('Este usuario ya está autorizado para este enlace');
    }

    if (recipient) {
      recipient.revokedAt = null;
      recipient.grantedBy = granter;
    } else {
      recipient = this.recipientRepository.create({
        shareLink,
        recipientUser,
        recipientUsername: recipientUser.username,
        grantedBy: granter,
      });
    }

    const saved = await this.recipientRepository.save(recipient);

    const resourceTitle = await this.resolveResourceTitle(shareLink.resourceType, shareLink.resourceId);

    this.eventBus.emit('share.recipient.authorized', {
      shareLinkId: shareLink.id,
      resourceType: shareLink.resourceType,
      resourceId: shareLink.resourceId,
      resourceTitle,
      recipientEmail: recipientUser.email,
      recipientName: `${recipientUser.name} ${recipientUser.lastName}`,
      authorizedByName: `${granter.name} ${granter.lastName}`,
      shareUrl: this.buildShareUrl(shareLink.token),
    });

    return this.toRecipientResponseDto({ ...saved, recipientUser });
  }

  async listAuthorizedRecipients(shareLinkId: string): Promise<AuthorizedRecipientResponseDto[]> {
    await this.findShareLinkOrFail(shareLinkId);

    const recipients = await this.recipientRepository.find({
      where: { shareLink: { id: shareLinkId } },
      relations: ['recipientUser'],
      order: { createdAt: 'DESC' },
    });

    return recipients.map((recipient) => this.toRecipientResponseDto(recipient));
  }

  async revokeRecipient(
    shareLinkId: string,
    recipientId: string,
    revokedBy: JwtPayload,
  ): Promise<{ message: string }> {
    const recipient = await this.recipientRepository.findOne({
      where: { id: recipientId, shareLink: { id: shareLinkId } },
      relations: ['recipientUser'],
    });
    if (!recipient) {
      throw new NotFoundException('Destinatario autorizado no encontrado');
    }

    recipient.revokedAt = new Date();
    await this.recipientRepository.save(recipient);

    this.eventBus.emit('share.recipient.revoked', {
      shareLinkId,
      recipientUserId: recipient.recipientUser.id,
      revokedByName: revokedBy.name,
    });

    return { message: 'Acceso revocado exitosamente' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Validación de acceso (hot path) y auditoría
  // ─────────────────────────────────────────────────────────────────────────────

  async validateAccess(
    token: string,
    requestingUser: JwtPayload | undefined,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<ValidateAccessResponseDto> {
    const shareLink = await this.shareLinkRepository.findOne({
      where: { token },
      relations: ['owner'],
    });

    if (!shareLink) {
      this.recordAttempt({ token, granted: false, reason: ShareAccessReason.TOKEN_NOT_FOUND, requestingUser, context });
      return { granted: false, reason: ShareAccessReason.TOKEN_NOT_FOUND };
    }

    const base = {
      token,
      shareLinkId: shareLink.id,
      resourceType: shareLink.resourceType,
      resourceId: shareLink.resourceId,
      requestingUser,
      context,
    };

    if (shareLink.revokedAt) {
      this.recordAttempt({ ...base, granted: false, reason: ShareAccessReason.REVOKED });
      return this.denyResponse(shareLink, ShareAccessReason.REVOKED);
    }

    if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
      this.recordAttempt({ ...base, granted: false, reason: ShareAccessReason.EXPIRED });
      return this.denyResponse(shareLink, ShareAccessReason.EXPIRED);
    }

    if (shareLink.resourceType === ShareResourceType.PROFILE) {
      this.recordAttempt({ ...base, granted: true, reason: ShareAccessReason.GRANTED });
      return {
        granted: true,
        reason: ShareAccessReason.GRANTED,
        resourceType: shareLink.resourceType,
        resourceId: shareLink.resourceId,
      };
    }

    if (!requestingUser) {
      this.recordAttempt({ ...base, granted: false, reason: ShareAccessReason.NOT_AUTHENTICATED });
      return this.denyResponse(shareLink, ShareAccessReason.NOT_AUTHENTICATED);
    }

    if (requestingUser.id === shareLink.owner.id) {
      this.recordAttempt({ ...base, granted: true, reason: ShareAccessReason.OWNER_ACCESS });
      return {
        granted: true,
        reason: ShareAccessReason.OWNER_ACCESS,
        resourceType: shareLink.resourceType,
        resourceId: shareLink.resourceId,
      };
    }

    const isAuthorized = await this.recipientRepository.exists({
      where: {
        shareLink: { id: shareLink.id },
        recipientUser: { id: requestingUser.id },
        revokedAt: IsNull(),
      },
    });

    if (!isAuthorized) {
      this.recordAttempt({ ...base, granted: false, reason: ShareAccessReason.NOT_AUTHORIZED });
      return this.denyResponse(shareLink, ShareAccessReason.NOT_AUTHORIZED);
    }

    this.recordAttempt({ ...base, granted: true, reason: ShareAccessReason.GRANTED });
    return {
      granted: true,
      reason: ShareAccessReason.GRANTED,
      resourceType: shareLink.resourceType,
      resourceId: shareLink.resourceId,
    };
  }

  /**
   * Usado por `PlaylistPermissionGuard` para conceder acceso de solo lectura a
   * una playlist a quien fue autorizado vía un enlace de compartir (sin ser
   * `PlaylistCollaborator`, mecanismo de edición distinto). Nunca concede
   * WRITE/ADMIN.
   */
  async hasActivePlaylistAccess(playlistId: string, userId: string): Promise<boolean> {
    return this.hasActiveResourceAccess(ShareResourceType.PLAYLIST, playlistId, userId);
  }

  private async hasActiveResourceAccess(
    resourceType: ShareResourceType,
    resourceId: string,
    userId: string,
  ): Promise<boolean> {
    const activeLinks = await this.shareLinkRepository.find({
      where: { resourceType, resourceId, revokedAt: IsNull() },
      select: ['id', 'expiresAt'],
    });

    const validLinkIds = activeLinks
      .filter((link) => !link.expiresAt || link.expiresAt.getTime() > Date.now())
      .map((link) => link.id);

    if (validLinkIds.length === 0) return false;

    return this.recipientRepository.exists({
      where: {
        shareLink: { id: In(validLinkIds) },
        recipientUser: { id: userId },
        revokedAt: IsNull(),
      },
    });
  }

  async listAccessLog(shareLinkId: string, pagination: AccessLogPaginationDto) {
    const { limit, offset, granted } = pagination;
    const qb = this.accessLogRepository
      .createQueryBuilder('log')
      .where('log.shareLinkId = :shareLinkId', { shareLinkId })
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (granted !== undefined) qb.andWhere('log.granted = :granted', { granted });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }

  /** Persiste el registro de auditoría fuera del hot path del guard (llamado por el listener de eventos). */
  async persistAccessLog(payload: {
    token: string;
    shareLinkId?: string;
    resourceType?: ShareResourceType;
    resourceId?: string;
    accessorUserId?: string;
    accessorUsername?: string;
    granted: boolean;
    reason: ShareAccessReason;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const log = this.accessLogRepository.create(payload);
    await this.accessLogRepository.save(log);

    if (payload.granted && payload.shareLinkId) {
      await this.shareLinkRepository.increment({ id: payload.shareLinkId }, 'viewCount', 1);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Auxiliares privados
  // ─────────────────────────────────────────────────────────────────────────────

  private async findOrCreateShareLink(
    owner: User,
    resourceType: ShareResourceType,
    resourceId: string,
    dto: CreateShareLinkDto,
  ): Promise<ShareLink> {
    await this.assertResourceExists(resourceType, resourceId);

    const existing = await this.shareLinkRepository.findOne({
      where: { owner: { id: owner.id }, resourceType, resourceId, revokedAt: IsNull() },
      relations: ['owner'],
    });

    if (existing && (!existing.expiresAt || existing.expiresAt.getTime() > Date.now())) {
      return existing;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1_000)
      : null;

    const shareLink = this.shareLinkRepository.create({
      token,
      resourceType,
      resourceId,
      owner,
      expiresAt,
    });

    const saved = await this.shareLinkRepository.save(shareLink);

    this.eventBus.emit('share.created', {
      shareLinkId: saved.id,
      resourceType,
      resourceId,
      ownerName: `${owner.name} ${owner.lastName}`,
      shareUrl: this.buildShareUrl(saved.token),
    });

    return { ...saved, owner };
  }

  private async assertResourceExists(resourceType: ShareResourceType, resourceId: string): Promise<void> {
    if (resourceType === ShareResourceType.PLAYLIST) {
      const exists = await this.playlistRepository.exists({ where: { id: resourceId } });
      if (!exists) throw new NotFoundException('Playlist no encontrada');
    }
    if (resourceType === ShareResourceType.TRACK) {
      const exists = await this.trackRepository.exists({ where: { id: resourceId } });
      if (!exists) throw new NotFoundException('Track no encontrado');
    }
  }

  private async resolveResourceTitle(resourceType: ShareResourceType, resourceId: string): Promise<string> {
    if (resourceType === ShareResourceType.PLAYLIST) {
      const playlist = await this.playlistRepository.findOne({ where: { id: resourceId } });
      return playlist?.title ?? 'Playlist';
    }
    if (resourceType === ShareResourceType.TRACK) {
      const track = await this.trackRepository.findOne({ where: { id: resourceId } });
      return track?.title ?? 'Track';
    }
    return 'Perfil';
  }

  private async findUserOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async findShareLinkOrFail(id: string): Promise<ShareLink> {
    const shareLink = await this.shareLinkRepository.findOne({ where: { id }, relations: ['owner'] });
    if (!shareLink) throw new NotFoundException('Enlace de compartir no encontrado');
    return shareLink;
  }

  private recordAttempt(params: {
    token: string;
    shareLinkId?: string;
    resourceType?: ShareResourceType;
    resourceId?: string;
    granted: boolean;
    reason: ShareAccessReason;
    requestingUser?: JwtPayload;
    context: { ipAddress?: string; userAgent?: string };
  }): void {
    this.eventBus.emit('share.access.attempted', {
      token: params.token,
      shareLinkId: params.shareLinkId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      accessorUserId: params.requestingUser?.id,
      granted: params.granted,
      reason: params.reason,
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    });
  }

  private denyResponse(shareLink: ShareLink, reason: ShareAccessReason): ValidateAccessResponseDto {
    return {
      granted: false,
      reason,
      resourceType: shareLink.resourceType,
      resourceId: shareLink.resourceId,
    };
  }

  private buildShareUrl(token: string): string {
    const baseUrl =
      this.configService.get<string>('WEB_APP_DEVELOPMENT') ||
      this.configService.get<string>('WEB_APP_PRODUCTION');
    return `${baseUrl}/compartir/${token}`;
  }

  private toShareLinkResponseDto(shareLink: ShareLink): ShareLinkResponseDto {
    const dto = new ShareLinkResponseDto();
    dto.id = shareLink.id;
    dto.token = shareLink.token;
    dto.resourceType = shareLink.resourceType;
    dto.resourceId = shareLink.resourceId;
    dto.shareUrl = this.buildShareUrl(shareLink.token);
    dto.expiresAt = shareLink.expiresAt;
    dto.revokedAt = shareLink.revokedAt;
    dto.viewCount = shareLink.viewCount;
    dto.createdAt = shareLink.createdAt;
    return dto;
  }

  private toRecipientResponseDto(recipient: ShareAuthorizedRecipient): AuthorizedRecipientResponseDto {
    const dto = new AuthorizedRecipientResponseDto();
    dto.id = recipient.id;
    dto.recipientUserId = recipient.recipientUser.id;
    dto.recipientName = `${recipient.recipientUser.name} ${recipient.recipientUser.lastName}`;
    dto.recipientUsername = recipient.recipientUsername;
    dto.revokedAt = recipient.revokedAt;
    dto.createdAt = recipient.createdAt;
    return dto;
  }
}
