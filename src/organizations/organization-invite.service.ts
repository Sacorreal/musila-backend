import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { MembershipRole } from 'src/authorization/entities/membership-role.entity';
import { Role } from 'src/authorization/entities/role.entity';
import { RoleSource } from 'src/authorization/entities/role-source.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { OrganizationInviteResponseDto } from './dto/organization-invite-response.dto';
import { MembershipStatus } from './entities/membership-status.enum';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { OrganizationInviteStatus } from './entities/organization-invite-status.enum';
import { OrganizationMembership } from './entities/organization-membership.entity';

/** Vigencia del token de invitación de Organization Admin (7 días). */
const EXPIRATION_MS = 7 * 24 * 60 * 60 * 1_000;

export interface CreateAdminInviteParams {
  organizationId: string;
  email: string;
  invitedBy?: string;
  roleKey?: string;
  /** Manager de una transacción en curso (p. ej. la creación de la organización). */
  manager?: EntityManager;
}

/**
 * Ciclo de vida de las invitaciones por email a una organización: creación
 * del token, validación pública y consumo (creación de la membership + rol
 * al aceptar). Complementa a `MembershipService`, que solo opera sobre
 * usuarios ya existentes.
 */
@Injectable()
export class OrganizationInviteService {
  constructor(
    @InjectRepository(OrganizationInvite)
    private readonly inviteRepository: Repository<OrganizationInvite>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  /** Crea la invitación y devuelve la entidad persistida (con su token). */
  async createAdminInvite(params: CreateAdminInviteParams): Promise<OrganizationInvite> {
    const repository = params.manager
      ? params.manager.getRepository(OrganizationInvite)
      : this.inviteRepository;

    const invite = repository.create({
      token: crypto.randomBytes(32).toString('hex'),
      email: params.email,
      organizationId: params.organizationId,
      roleKey: params.roleKey ?? 'ORGANIZATION_ADMIN',
      invitedBy: params.invitedBy,
      status: OrganizationInviteStatus.PENDING,
      expiresAt: new Date(Date.now() + EXPIRATION_MS),
    });

    return repository.save(invite);
  }

  /** Valida el token (existe, PENDING, no expirado) sin consumirlo. */
  async validate(token: string): Promise<OrganizationInviteResponseDto> {
    const invite = await this.findValidOrFail(token);
    return {
      token: invite.token,
      email: invite.email,
      organizationId: invite.organizationId,
      organizationName: invite.organization?.name ?? '',
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Consume la invitación para un usuario ya creado: crea la membership
   * ACTIVE, le asigna el rol SYSTEM correspondiente y marca la invitación
   * como aceptada, todo en una transacción.
   */
  async consumeForUser(token: string, userId: string): Promise<{ organizationId: string }> {
    const invite = await this.findValidOrFail(token);

    await this.dataSource.transaction(async (manager) => {
      const role = await manager.findOne(Role, {
        where: { key: invite.roleKey, source: RoleSource.SYSTEM },
      });
      if (!role) {
        throw new BadRequestException(
          `No existe el rol SYSTEM ${invite.roleKey}; ejecuta los seeds de autorización`,
        );
      }

      const membership = await manager.save(
        manager.create(OrganizationMembership, {
          organizationId: invite.organizationId,
          userId,
          status: MembershipStatus.ACTIVE,
          invitedBy: invite.invitedBy,
          joinedAt: new Date(),
        }),
      );

      await manager.save(
        manager.create(MembershipRole, {
          membershipType: invite.membershipType,
          membershipId: membership.id,
          roleId: role.id,
          assignedBy: invite.invitedBy,
        }),
      );

      invite.status = OrganizationInviteStatus.ACCEPTED;
      invite.acceptedUserId = userId;
      invite.acceptedAt = new Date();
      await manager.save(invite);
    });

    this.eventBus.emit('authorization.membership.updated', { userId });

    return { organizationId: invite.organizationId };
  }

  private async findValidOrFail(token: string): Promise<OrganizationInvite> {
    const invite = await this.inviteRepository.findOne({
      where: { token },
      relations: { organization: true },
    });
    if (!invite) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if (invite.status === OrganizationInviteStatus.ACCEPTED) {
      throw new BadRequestException('Esta invitación ya fue utilizada');
    }
    if (invite.status === OrganizationInviteStatus.REVOKED) {
      throw new BadRequestException('Esta invitación fue revocada');
    }
    if (invite.expiresAt < new Date()) {
      throw new GoneException('Esta invitación ha expirado');
    }
    return invite;
  }
}
