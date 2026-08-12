import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource, Repository } from 'typeorm';
import { AccessRequest } from './entities/access-request.entity';
import { AccessRequestStatus } from './entities/access-request-status.enum';
import { Organization } from './entities/organization.entity';
import { WorkspaceInviteLink } from './entities/workspace-invite-link.entity';
import { WorkspaceInviteLinkStatus } from './entities/workspace-invite-link-status.enum';

/** Vigencia por defecto del enlace de workspace (30 días). */
const DEFAULT_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1_000;

export interface CreateInviteLinkOptions {
  /** Días de vigencia; `null` = sin expiración. Por defecto 30 días. */
  expiresInDays?: number | null;
  /** Máximo de registros permitidos; `null`/omitido = ilimitado. */
  maxUses?: number | null;
}

export interface WorkspaceInviteValidation {
  organizationId: string;
  organizationName: string;
  token: string;
}

/**
 * Ciclo de vida del enlace de invitación reutilizable de un workspace: creación
 * (a lo sumo uno ACTIVE por organización), validación pública y consumo (alta de
 * la `AccessRequest` PENDING al registrarse un invitado). Complementa a
 * `OrganizationInviteService`, que gestiona invitaciones por-email de un solo
 * destinatario.
 */
@Injectable()
export class WorkspaceInviteService {
  constructor(
    @InjectRepository(WorkspaceInviteLink)
    private readonly inviteLinkRepository: Repository<WorkspaceInviteLink>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
  ) {}

  /** Devuelve el enlace ACTIVE vigente de la organización o crea uno nuevo. */
  async getOrCreateActiveLink(
    organizationId: string,
    createdBy: string,
    options: CreateInviteLinkOptions = {},
  ): Promise<WorkspaceInviteLink> {
    const existing = await this.findActiveLink(organizationId);
    if (existing && !this.isExpired(existing)) {
      return existing;
    }
    if (existing) {
      // El vigente expiró: se revoca para mantener a lo sumo uno ACTIVE.
      existing.status = WorkspaceInviteLinkStatus.REVOKED;
      await this.inviteLinkRepository.save(existing);
    }
    return this.createLink(organizationId, createdBy, options);
  }

  /** Revoca el enlace actual y genera uno nuevo. */
  async regenerate(
    organizationId: string,
    createdBy: string,
    options: CreateInviteLinkOptions = {},
  ): Promise<WorkspaceInviteLink> {
    await this.revoke(organizationId);
    return this.createLink(organizationId, createdBy, options);
  }

  /** Revoca el enlace ACTIVE de la organización (si existe). */
  async revoke(organizationId: string): Promise<void> {
    const existing = await this.findActiveLink(organizationId);
    if (!existing) return;
    existing.status = WorkspaceInviteLinkStatus.REVOKED;
    await this.inviteLinkRepository.save(existing);
  }

  /** Valida el token (ACTIVE, no expirado, con usos disponibles) sin consumirlo. */
  async validatePublic(token: string): Promise<WorkspaceInviteValidation> {
    const link = await this.findValidOrFail(token);
    const organization = await this.organizationRepository.findOne({
      where: { id: link.organizationId },
    });
    return {
      organizationId: link.organizationId,
      organizationName: organization?.name ?? '',
      token: link.token,
    };
  }

  /**
   * Consume el enlace para un usuario recién creado: incrementa el contador de
   * usos y crea la solicitud de acceso PENDING en una transacción. Emite el
   * evento para notificar al administrador.
   */
  async consumeForNewUser(token: string, userId: string): Promise<AccessRequest> {
    const accessRequest = await this.dataSource.transaction(async (manager) => {
      const link = await manager.findOne(WorkspaceInviteLink, { where: { token } });
      if (!link) throw new NotFoundException('Enlace de invitación no encontrado');
      this.assertUsable(link);

      link.useCount += 1;
      await manager.save(link);

      return manager.save(
        manager.create(AccessRequest, {
          organizationId: link.organizationId,
          inviteLinkId: link.id,
          userId,
          status: AccessRequestStatus.PENDING,
        }),
      );
    });

    this.eventBus.emit('organization.access_request.created', {
      organizationId: accessRequest.organizationId,
      requesterUserId: userId,
      accessRequestId: accessRequest.id,
    });

    return accessRequest;
  }

  private async createLink(
    organizationId: string,
    createdBy: string,
    options: CreateInviteLinkOptions,
  ): Promise<WorkspaceInviteLink> {
    const expiresInDays =
      options.expiresInDays === undefined ? DEFAULT_EXPIRATION_MS / (24 * 60 * 60 * 1_000) : options.expiresInDays;
    const expiresAt =
      expiresInDays === null ? null : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1_000);

    const link = this.inviteLinkRepository.create({
      token: crypto.randomBytes(24).toString('base64url'),
      organizationId,
      createdBy,
      status: WorkspaceInviteLinkStatus.ACTIVE,
      expiresAt,
      maxUses: options.maxUses ?? null,
      useCount: 0,
    });
    return this.inviteLinkRepository.save(link);
  }

  private findActiveLink(organizationId: string): Promise<WorkspaceInviteLink | null> {
    return this.inviteLinkRepository.findOne({
      where: { organizationId, status: WorkspaceInviteLinkStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  private async findValidOrFail(token: string): Promise<WorkspaceInviteLink> {
    const link = await this.inviteLinkRepository.findOne({ where: { token } });
    if (!link) throw new NotFoundException('Enlace de invitación no encontrado');
    this.assertUsable(link);
    return link;
  }

  private assertUsable(link: WorkspaceInviteLink): void {
    if (link.status === WorkspaceInviteLinkStatus.REVOKED) {
      throw new BadRequestException(
        'Este enlace fue revocado. Solicita un nuevo enlace al administrador.',
      );
    }
    if (this.isExpired(link)) {
      throw new GoneException(
        'Este enlace ha expirado. Solicita un nuevo enlace al administrador.',
      );
    }
    if (link.maxUses != null && link.useCount >= link.maxUses) {
      throw new GoneException(
        'Este enlace alcanzó su límite de usos. Solicita un nuevo enlace al administrador.',
      );
    }
  }

  private isExpired(link: WorkspaceInviteLink): boolean {
    return link.expiresAt != null && link.expiresAt < new Date();
  }
}
