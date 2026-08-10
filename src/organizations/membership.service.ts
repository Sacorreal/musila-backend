import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { Repository } from 'typeorm';
import { MembershipStatus } from './entities/membership-status.enum';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { RosterMembership } from './entities/roster-membership.entity';
import { TenantType } from './entities/tenant-type.enum';

export interface ResolvedMembership {
  type: MembershipType;
  id: string;
  status: MembershipStatus;
  organizationId: string;
}

type AnyMembership = OrganizationMembership | RosterMembership;

/**
 * Ciclo de vida de las memberships de staff (OrganizationMembership) y de
 * roster (RosterMembership): INVITED → PENDING → ACTIVE → SUSPENDED/REMOVED.
 * La incorporación siempre es por invitación + aceptación (§4).
 */
@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly organizationMembershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(RosterMembership)
    private readonly rosterMembershipRepository: Repository<RosterMembership>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Busca la membership del usuario en la organización, en cualquier
   * estado: el motor necesita distinguir "no existe" de "existe pero no
   * está ACTIVE" para el diagnóstico MEMBERSHIP_INACTIVE.
   */
  async findMembershipForOrganization(
    userId: string,
    organizationId: string,
  ): Promise<ResolvedMembership | undefined> {
    const organizationMembership = await this.organizationMembershipRepository.findOne({
      where: { userId, organizationId },
    });
    if (organizationMembership) {
      return this.toResolved(MembershipType.ORGANIZATION, organizationMembership);
    }

    const rosterMembership = await this.rosterMembershipRepository.findOne({
      where: { userId, organizationId },
    });
    if (rosterMembership) {
      return this.toResolved(MembershipType.ROSTER, rosterMembership);
    }

    return undefined;
  }

  /** Memberships ACTIVE del usuario en organizaciones del tenant PLATFORM (staff de Musila). */
  async findActivePlatformMemberships(userId: string): Promise<OrganizationMembership[]> {
    return this.organizationMembershipRepository.find({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        organization: { tenant: { type: TenantType.PLATFORM } },
      },
      relations: { organization: { tenant: true } },
    });
  }

  /** Todas las memberships del usuario (ambos tipos), para /users/me/memberships. */
  async findAllForUser(userId: string): Promise<{
    organizationMemberships: OrganizationMembership[];
    rosterMemberships: RosterMembership[];
  }> {
    const [organizationMemberships, rosterMemberships] = await Promise.all([
      this.organizationMembershipRepository.find({
        where: { userId },
        relations: { organization: true },
      }),
      this.rosterMembershipRepository.find({
        where: { userId },
        relations: { organization: true },
      }),
    ]);

    return { organizationMemberships, rosterMemberships };
  }

  async findMembersOfOrganization(
    organizationId: string,
    type: MembershipType,
  ): Promise<AnyMembership[]> {
    return this.repositoryFor(type).find({
      where: { organizationId },
      relations: { user: true },
    });
  }

  async invite(params: {
    type: MembershipType;
    organizationId: string;
    userId: string;
    invitedBy: string;
  }): Promise<AnyMembership> {
    const repository = this.repositoryFor(params.type);

    const existing = await repository.findOne({
      where: { userId: params.userId, organizationId: params.organizationId },
    });
    if (existing && existing.status !== MembershipStatus.REMOVED) {
      throw new BadRequestException('El usuario ya tiene una membership en esta organización');
    }

    const membership = existing ?? repository.create({
      organizationId: params.organizationId,
      userId: params.userId,
    });
    membership.status = MembershipStatus.INVITED;
    membership.invitedBy = params.invitedBy;
    membership.joinedAt = undefined;

    const saved = await repository.save(membership);
    this.emitMembershipUpdated(params.userId);
    return saved;
  }

  async accept(type: MembershipType, membershipId: string, userId: string): Promise<AnyMembership> {
    const membership = await this.getById(type, membershipId);

    if (membership.userId !== userId) {
      throw new BadRequestException('La invitación no pertenece a este usuario');
    }
    if (membership.status !== MembershipStatus.INVITED && membership.status !== MembershipStatus.PENDING) {
      throw new BadRequestException(`La membership no es aceptable en estado ${membership.status}`);
    }

    membership.status = MembershipStatus.ACTIVE;
    membership.joinedAt = new Date();

    const saved = await this.repositoryFor(type).save(membership);
    this.emitMembershipUpdated(membership.userId);
    return saved;
  }

  async changeStatus(
    type: MembershipType,
    membershipId: string,
    status: MembershipStatus.ACTIVE | MembershipStatus.SUSPENDED | MembershipStatus.REMOVED,
  ): Promise<AnyMembership> {
    const membership = await this.getById(type, membershipId);
    membership.status = status;

    const saved = await this.repositoryFor(type).save(membership);
    this.emitMembershipUpdated(membership.userId);
    return saved;
  }

  /** Resuelve una membership por id sin conocer su tipo (staff u roster). */
  async resolveById(
    membershipId: string,
  ): Promise<{ type: MembershipType; membership: AnyMembership } | undefined> {
    const organizationMembership = await this.organizationMembershipRepository.findOne({
      where: { id: membershipId },
    });
    if (organizationMembership) {
      return { type: MembershipType.ORGANIZATION, membership: organizationMembership };
    }

    const rosterMembership = await this.rosterMembershipRepository.findOne({
      where: { id: membershipId },
    });
    if (rosterMembership) {
      return { type: MembershipType.ROSTER, membership: rosterMembership };
    }

    return undefined;
  }

  async getById(type: MembershipType, membershipId: string): Promise<AnyMembership> {
    const membership = await this.repositoryFor(type).findOne({ where: { id: membershipId } });
    if (!membership) {
      throw new NotFoundException('Membership no encontrada');
    }
    return membership;
  }

  private repositoryFor(type: MembershipType): Repository<AnyMembership> {
    return (
      type === MembershipType.ORGANIZATION
        ? this.organizationMembershipRepository
        : this.rosterMembershipRepository
    ) as Repository<AnyMembership>;
  }

  private toResolved(type: MembershipType, membership: AnyMembership): ResolvedMembership {
    return {
      type,
      id: membership.id,
      status: membership.status,
      organizationId: membership.organizationId,
    };
  }

  private emitMembershipUpdated(userId: string): void {
    this.eventBus.emit('authorization.membership.updated', { userId });
  }
}
