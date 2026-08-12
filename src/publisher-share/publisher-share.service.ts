import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { PublisherShare } from './entities/publisher-share.entity';
import {
  PublisherSharePolicyView,
  ResolvedPublisherShare,
  RosterPublisherShareView,
} from './publisher-share.types';

export interface PublisherShareInput {
  userId: string;
  enabled: boolean;
  percentage: number;
}

/**
 * Gestiona el Publisher's Share: el porcentaje que una publisher declara de forma
 * global por cada miembro de su roster. `resolveForUser` es la fuente de verdad
 * que consume `SplitService` para inyectarlo como metadata informativa del
 * expediente en cada canción que el autor publica.
 */
@Injectable()
export class PublisherShareService {
  constructor(
    @InjectRepository(PublisherShare)
    private readonly sharesRepo: Repository<PublisherShare>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /** Roster ACTIVE con su Publisher's Share configurado. */
  async getPolicy(organizationId: string): Promise<PublisherSharePolicyView> {
    await this.assertPublisher(organizationId);
    return {
      organizationId,
      roster: await this.listRosterWithShares(organizationId),
    };
  }

  /** Bulk upsert del Publisher's Share por miembro del roster. */
  async upsertShares(
    organizationId: string,
    items: PublisherShareInput[],
  ): Promise<PublisherSharePolicyView> {
    await this.assertPublisher(organizationId);

    const activeUserIds = await this.activeRosterUserIds(organizationId);
    for (const item of items) {
      if (!activeUserIds.has(item.userId)) {
        throw new BadRequestException(`El usuario ${item.userId} no es miembro activo del roster`);
      }
      if (item.enabled && item.percentage <= 0) {
        throw new BadRequestException(
          `Para activar el Publisher's Share de ${item.userId} el porcentaje debe ser mayor a 0`,
        );
      }
    }

    for (const item of items) {
      let row = await this.sharesRepo.findOne({
        where: { organizationId, userId: item.userId },
      });
      if (!row) {
        row = this.sharesRepo.create({ organizationId, userId: item.userId });
      }
      row.enabled = item.enabled;
      row.percentage = item.percentage;
      await this.sharesRepo.save(row);
    }

    return this.getPolicy(organizationId);
  }

  /** Miembros ACTIVE del roster con su Publisher's Share (por defecto deshabilitado). */
  async listRosterWithShares(organizationId: string): Promise<RosterPublisherShareView[]> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      relations: { user: true },
    });
    if (!members.length) return [];

    const shares = await this.sharesRepo.find({ where: { organizationId } });
    const byUser = new Map(shares.map((s) => [s.userId, s]));

    return members.map((m) => {
      const config = byUser.get(m.userId);
      return {
        userId: m.userId,
        name: [m.user.name, m.user.lastName].filter(Boolean).join(' ').trim(),
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        enabled: config?.enabled ?? false,
        percentage: config ? Number(config.percentage) : 0,
      };
    });
  }

  /**
   * Resuelve el Publisher's Share que aplica a `creatorUserId`: por cada
   * organización PUBLISHER donde es miembro ACTIVE y tiene el share activado con
   * porcentaje > 0. Se usa como metadata informativa del expediente del track y
   * para mostrarlo en la UI del split.
   */
  async resolveForUser(creatorUserId: string): Promise<ResolvedPublisherShare[]> {
    const memberships = await this.rosterRepo.find({
      where: {
        userId: creatorUserId,
        status: MembershipStatus.ACTIVE,
        organization: { type: OrganizationType.PUBLISHER },
      },
      relations: { organization: true },
    });
    if (!memberships.length) return [];

    const organizationIds = memberships.map((m) => m.organizationId);
    const shares = await this.sharesRepo.find({
      where: { organizationId: In(organizationIds), userId: creatorUserId, enabled: true },
    });
    const byOrg = new Map(shares.map((s) => [s.organizationId, s]));

    const resolved: ResolvedPublisherShare[] = [];
    for (const membership of memberships) {
      const config = byOrg.get(membership.organizationId);
      if (!config) continue;
      const percentage = Number(config.percentage);
      if (percentage <= 0) continue;
      resolved.push({
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        percentage,
      });
    }
    return resolved;
  }

  private async activeRosterUserIds(organizationId: string): Promise<Set<string>> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });
    return new Set(members.map((m) => m.userId));
  }

  private async assertPublisher(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.type !== OrganizationType.PUBLISHER) {
      throw new BadRequestException("El Publisher's Share solo aplica a organizaciones tipo PUBLISHER");
    }
  }
}
