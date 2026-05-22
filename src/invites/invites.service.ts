import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { Invite } from './entities/invite.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';

/** Tiempo de expiración de la invitación en milisegundos (24 horas) */
const EXPIRATION_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos públicos
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Crea una nueva invitación para el usuario autenticado.
   * Genera token criptográfico, URL de invitación y QR en base64.
   */
  async createInvite(
    userId: string,
    dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    const owner = await this.findUserOrFail(userId);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EXPIRATION_MS);

    const invite = this.inviteRepository.create({
      token,
      email: dto.email,
      isUsed: false,
      expiresAt,
      invitedBy: owner,
    });

    const saved = await this.inviteRepository.save(invite);

    const inviteUrl = this.buildInviteUrl(saved.token);
    const qrCode = await this.generateQrDataUri(inviteUrl);

    if (saved.email) {
      this.eventBus.emit('invite.created', {
        email: saved.email,
        token: saved.token,
        invitedByName: owner.name,
        guestName: dto.guestName,
        inviteUrl,
      });
    }

    return this.toResponseDto(saved, inviteUrl, qrCode);
  }

  /**
   * Valida si el token existe, no está expirado y no fue utilizado.
   * No lo marca como usado: eso se hace en markAsUsed.
   */
  async validateInvite(token: string): Promise<InviteResponseDto> {
    const invite = await this.findInviteByTokenOrFail(token);

    this.assertNotUsed(invite);
    this.assertNotExpired(invite);

    const inviteUrl = this.buildInviteUrl(invite.token);
    const qrCode = await this.generateQrDataUri(inviteUrl);

    return this.toResponseDto(invite, inviteUrl, qrCode);
  }

  /**
   * Marca el token como utilizado (isUsed = true).
   * Valida que el token exista, no esté usado y no haya expirado.
   */
  async markAsUsed(token: string): Promise<{ message: string }> {
    const invite = await this.findInviteByTokenOrFail(token);

    this.assertNotUsed(invite);
    this.assertNotExpired(invite);

    invite.isUsed = true;
    await this.inviteRepository.save(invite);

    return { message: 'Invitación utilizada exitosamente' };
  }

  /**
   * Valida el token y retorna la entidad Invite completa (con invitedBy).
   * Uso interno entre servicios — NO exponer al controller.
   */
  async validateAndGetInvite(token: string): Promise<Invite> {
    const invite = await this.findInviteByTokenOrFail(token);

    this.assertNotUsed(invite);
    this.assertNotExpired(invite);

    return invite;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos privados auxiliares
  // ─────────────────────────────────────────────────────────────────────────────

  private async findUserOrFail(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async findInviteByTokenOrFail(token: string): Promise<Invite> {
    const invite = await this.inviteRepository.findOne({
      where: { token },
      relations: ['invitedBy'],
    });
    if (!invite) throw new NotFoundException('Invitación no encontrada');
    return invite;
  }

  private assertNotUsed(invite: Invite): void {
    if (invite.isUsed) {
      throw new BadRequestException('Esta invitación ya fue utilizada');
    }
  }

  private assertNotExpired(invite: Invite): void {
    if (invite.expiresAt < new Date()) {
      throw new GoneException('Esta invitación ha expirado');
    }
  }

  private buildInviteUrl(token: string): string {
    const baseUrl =
      this.configService.get<string>('WEB_APP_DEVELOPMENT') || this.configService.get<string>('WEB_APP_PRODUCTION');
    return `${baseUrl}/invite/${token}`;
  }

  private async generateQrDataUri(url: string): Promise<string> {
    return QRCode.toDataURL(url);
  }

  private toResponseDto(
    invite: Invite,
    inviteUrl: string,
    qrCode: string,
  ): InviteResponseDto {
    const dto = new InviteResponseDto();
    dto.id = invite.id;
    dto.token = invite.token;
    dto.email = invite.email;
    dto.isUsed = invite.isUsed;
    dto.expiresAt = invite.expiresAt;
    dto.createdAt = invite.createdAt;
    dto.inviteUrl = inviteUrl;
    dto.qrCode = qrCode;
    return dto;
  }
}
